const { AuthenticationError } = require('apollo-server-express');
const { User, Project } = require('../models');

const { signToken } = require('../utils/auth');

const resolvers = {
  Query: {
    users: async () => {
      return User.find().populate('projects')
    },
    user: async (parent, { username }) => {
      return User.findOne({ username }).populate('projects');
    },
    project: async (parent, { projectId }) => {
      return Project.findOne({ _id: projectId }).populate('steps')
    },
    me: async (parent, args, context) => {
      if (context.user) {
        return User.findOne({ _id: context.user._id }).populate('projects');
      }
      throw new AuthenticationError('You need to be logged in!');
    },
  },

  Mutation: {
    addUser: async (parent, { username, email, password }) => {
      console.log("tacobell")
      const user = await User.create({ username, email, password });
      const token = signToken(user);
      return { token, user };
    },
    login: async (parent, { email, password }) => {
      const user = await User.findOne({ email });

      if (!user) {
        throw new AuthenticationError('No user found with this email address');
      }

      const correctPw = await user.isCorrectPassword(password);

      if (!correctPw) {
        throw new AuthenticationError('Incorrect credentials');
      }

      const token = signToken(user);

      return { token, user };
    },


    // need to make sure its the write author
    addProject: async (parent, { userId, title, description }, context) => {
      if (context.user) {
        const project = await Project.create({
          title,
          description,
          projectAuthor: context.user.username,
        });

        await User.findOneAndUpdate(
          { _id: userId },
          // { _Id: context.user._id },
          { $addToSet: { projects: project._id } }
        );
        return project;
      }
      throw new AuthenticationError('You need to be logged in!');
    },


    // working now
    removeProject: async (parent, { projectId }, context) => {
      if (context.user) {
        const project = await Project.findOneAndDelete({
          _id: projectId,
          projectAuthor: context.user.username,
        });

        await User.findOneAndUpdate(
          { _id: context.user._id },
          { $pull: { projects: projectId } },

        );

        return project;
      }
      throw new AuthenticationError('You need to be logged in!');
    },


    // working with context/auth
    updateProject: async (parent, { projectId, title, description }, context) => {
      if (context.user) {
        const project = await Project.findByIdAndUpdate(projectId, {
          title: title,
          description: description,
        });
        await User.findOneAndUpdate(
          { _id: context.user._id },
          { $set: { title, description } },
          { new: true }
        );
        return project;
      }
      throw new AuthenticationError('You need to be logged in!');
    },

    // add step working as well now
    addStep: async (parent, { projectId, completed, stepText }, context) => {
      if (context.user) {
        return Project.findOneAndUpdate(
          { _id: projectId },
          {
            $addToSet: {
              steps: { stepText, completed, stepAuthor: context.user.username },
            },
          },
          {
            new: true,
          }
        );
      }
      throw new AuthenticationError('You need to be logged in!');
    },

    // remove a step
    deleteStep: async (parent, { projectId, stepId }, context) => {
      if (context.user) {
        return Project.findOneAndUpdate(
          { _id: projectId },
          {
            $pull: {
              steps: {
                _id: stepId,
              },
            },
          },
          { new: true }
        );
      }
      throw new AuthenticationError('You need to be logged in!');
    },


    // update step
    updateStep: async (parent, { projectId, stepId, stepText, completed }, context) => {
      if (context.user) {
        const project = await Project.findOneAndUpdate(
          { _id: projectId },
          { 
           
            $addToSet: {
              steps: { 
                _id: stepId,
             stepText: stepText,
           completed: completed,
              },
            },
          },
          { runValidators: true, new: true }
        );
return project;
       
      }
      throw new AuthenticationError('You need to be logged in!');
    },
  },
};

module.exports = resolvers;






// without context addProject
// addProject: async (parent, { title, description, projectAuthor }) => {
//   const project = await Project.create({
//     title, 
//     description,
//     projectAuthor,
//   });
//  return project;
// }
