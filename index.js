import express from 'express';
import path from 'path';
import { fileLoader, mergeTypes, mergeResolvers } from 'merge-graphql-schemas';
import { ApolloServer } from 'apollo-server-express';
import { refreshTokens } from './auth';
import models from './models';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import * as StaffBar from '@staffbar/express';

const SECRET = "kwnej3h248923h3829rho23yhr8932832e";
const SECRET2 = "me32jrn8f93n89fn3dI83DQE32OKE0Ed9J"

const typeDefs = mergeTypes(fileLoader(path.join(__dirname, './schema')));
const resolvers = mergeResolvers(fileLoader(path.join(__dirname, './resolvers')));

// Dev
// const dev = process.env.NODE_ENV === 'development';
StaffBar.init({
	dev: true
})
//

const PORT = 4000;
const app = express();

// Dev
// Before all the middlewares!!
app.use(StaffBar.handler())
//

app.use(cors('*'));

const addUser = async (req, res, next) => {
  const token = req.headers['x_token'];
  if (token) {
    try {
      const { user } = jwt.verify(token, SECRET);
      req.user = user;
    } catch (err) {
      const refreshToken = req.headers['x_refresh_token'];
      const newTokens = await refreshTokens(token, refreshToken, models, SECRET, SECRET2);
      if (newTokens.token && newTokens.refreshToken) {
        res.set('Access-Control-Expose-Headers', 'x_token', 'x_refresh_token');
        res.set('x_token', newTokens.token);
        res.set('x_refresh_token', newTokens.refreshToken);
      }
      req.user = newTokens.user;
    }
  }
  next();
};

app.use(addUser);

const server = new ApolloServer({
   typeDefs, 
   resolvers,
   context: ({req, res, connection}) => { 
     const user = req.user;
     return { models, SECRET, SECRET2, user }; 
    },
});

server.applyMiddleware({ app });

app.get('/hello', (req, res) => { 
	console.log('Hello from inside your application!')	
	res.json({ hello: 'world' }) 
})


// Dev
//

models.sequelize.sync({force: true}).then(x => {
  app.use(StaffBar.errorHandler());
  app.listen({ port: PORT }, () =>
  console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`)
  );
});
