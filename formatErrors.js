import _ from "lodash";

const formatErrors = (e, models) => {
    if (e instanceof models.sequelize.ValidationError) {
      return e.errors.map(x => _.pick(x, ['path', 'message']));
    }
    return [{ path: 'name', message: 'something went wrong' }];
  };

export default formatErrors;