import { requiresAuth } from "../permissions";
import { PubSub, withFilter } from "graphql-subscriptions";

const pubSub = new PubSub();

const NEW_CHANNEL_MESSAGE = 'NEW_CHANNEL_MESSAGE';

export default {
  Subscription: {
    newChannelMessage: {
      subscribe: withFilter(
        () => pubSub.asyncIterator(NEW_CHANNEL_MESSAGE),
        (payload, args) => payload.channelId === args.channelId,
      )
    }
  },
  Message: {
    user: ({ userId }, args, { models }) => {
      return models.User.findOne({ where: { id: userId } }, { raw: true });
    }
  },
  Query: {
    messages: requiresAuth.createResolver(async (parent, {cursor,  channelId }, { models }) => {
      
      const options = {
        order: [['created_at', 'DESC']], 
        where: { channelId }, limit: 17
      }

      if(cursor) {
        options.where.created_at = {
          [models.Sequelize.Op.lt]: new Date(parseInt(cursor, 10)),
        };
      }
      
      return models.Message.findAll(
        options,
        { raw: true },
      )
    }),
  },
  Mutation: {
    createMessage: async (parent, args, { models, user }) => {
      try {
        const message = await models.Message.create({
          ...args,
          userId: user.id,
        });

        pubSub.publish(NEW_CHANNEL_MESSAGE, { 
          channelId: args.channelId,
          newChannelMessage: message.dataValues 
        });

        return true;
      } catch (err) {
        console.log(err);
        return false;
      }
    },
  },
};
