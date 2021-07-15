import formatErrors from "../formatErrors";
import { requiresAuth } from "../permissions";

export default {
  Query: {
    allTeams: requiresAuth.createResolver(async (parent, args, { models, user }) => {
      const teams = await models.Team.findAll({ where: { owner: user.id } }, { raw: true })
      return teams;
    }),
    inviteTeams: requiresAuth.createResolver(async (parent, args, { models, user }) => 
      models.sequelize.query('select * from teams join members on id = team_id where user_id = ?', {
        replacements: [user.id],
        model: models.Team,
      }))
  },
  Mutation: {
    addTeamMember: async (parent, {email, teamId}, { models, user }) => {
      try {
        const userToAdd = await models.User.findOne({ where: { email }}, { raw: true});
        if(!userToAdd) {
          return {
            ok: false,
            errors: [ {path: 'email', message: 'User with this email does not exist' }]
          }
        }

        await models.Member.create({ userId: userToAdd.id, teamId });
        return {
          ok: true,
        };
      } catch (err) {
        console.log(err);
        return {
          ok: false,
          errors: formatErrors(err)
        };
      }
    },
    createTeam: requiresAuth.createResolver(async (parent, args, { models, user }) => {
      try {
        const response = await models.sequelize.transaction(async() => {
          const team = await models.Team.create({ ...args, owner: user.id });
          await models.Channel.create({ name: 'general', public: true, teamId: team.id });
          return team;
        });
        return {
          ok: true,
          team: response
        };
      } catch (err) {
        console.log(err);
        return {
          ok: false,
          errors: formatErrors(err)
        };
      }
    }),
  },
  Team: {
    channels: ({ id }, args, { models }) => models.Channel.findAll({ where: {teamId: id}})
  }
};
