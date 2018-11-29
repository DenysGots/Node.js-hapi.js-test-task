'use strict';

const Hapi = require('hapi');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const server = new Hapi.Server({ port: process.env.PORT || 3000 });

// server.connection({ port: process.env.PORT || 3000 });

const init = async () => {
  await server.start(function () {
    console.log('Server running at:', server.info.uri);
  });
};

const sequelize = new Sequelize('postgres://fqrjvktt:t0fY0rIBUbMByJjlijZbvb_EdiP0Hkzl@horton.elephantsql.com:5432/fqrjvktt');

const User = sequelize.define('user', {
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  surname: {
    type: Sequelize.STRING,
    allowNull: false
  },
  userId: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    unique: true
  }
});

const Task = sequelize.define('task', {
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  description: {
    type: Sequelize.TEXT,
    allowNull: false
  },
  mark: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  status: {
    type: Sequelize.ENUM('active', 'inactive', 'declined', 'completed'),
    allowNull: false,
    defaultValue: 'active'
  },
  taskId: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    unique: true
  }
});

const Project = sequelize.define('project', {
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  body: {
    type: Sequelize.TEXT,
    allowNull: false
  },
  status: {
    type: Sequelize.ENUM('active', 'inactive', 'declined', 'completed'),
    allowNull: false,
    defaultValue: 'active'
  },
  projectId: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    unique: true
  }
});

const TasksParticipants = sequelize.define('tasksParticipants', {
  taskId: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  userId: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    unique: true
  }
});

const ProjectsTasks = sequelize.define('projectsTasks', {
  projectId: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  taskId: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    unique: true
  }
});

const TasksAuthors = sequelize.define('tasksAuthors', {
  taskId: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  userId: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    unique: true
  }
});

const ProjectsAuthors = sequelize.define('projectsAuthors', {
  projectId: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  userId: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    unique: true
  }
});

Task.belongsToMany(User, {as: 'Participants', through: 'TasksParticipants', foreignKey: 'taskId'});
User.belongsToMany(Task, {as: 'Tasks', through: 'TasksParticipants', foreignKey: 'userId'});

Task.belongsToMany(Project, {as: 'Projects', through: 'ProjectsTasks', foreignKey: 'taskId'});
Project.belongsToMany(Task, {as: 'Tasks', through: 'ProjectsTasks', foreignKey: 'projectId'});

Task.belongsTo(User, {as: 'author'});
User.belongsToMany(Task, {through: 'TasksAuthors', foreignKey: 'userId'});

Project.belongsTo(User, {as: 'author'});
User.belongsToMany(Project, {through: 'ProjectsAuthors', foreignKey: 'userId'});

server.route({
  method: 'GET',
  path: '/',
  handler: (request, reply) => {
    return reply.response('Node.js test task');
  }
});

// GET users
server.route({
  method: 'GET',
  path: '/api/users',
  handler: async (request, reply) => {
    const requestData = request.query;

    let response;
    let result = {};
    let limit = requestData.limit || 5;
    let offset = (requestData.page || 0) * limit;

    if (!requestData.user) {
      await User.findAndCountAll({
        offset: offset,
        limit: limit
      }).then(users => {
        if (users.count) {
          result.count = users.count;
          result.users = users.rows;
          result.limit = limit;
          result.offset = offset;

          response = reply.response(result).code(200);
        } else {
          response = reply.response('Nothing found').code(404);
        }
      });
    } else {
      await User.findAndCountAll({
        where: {
          [Op.or]: [
            {name: requestData.user},
            {surname: requestData.user},
            {email: requestData.user}
          ]
        },
        offset: offset,
        limit: limit
      }).then(users => {
        if (users.count) {
          result.count = users.count;
          result.users = users.rows;
          result.limit = limit;
          result.offset = offset;

          response = reply.response(result).code(200);
        } else {
          response = reply.response('Nothing found').code(404);
        }
      });
    }

    return response;
  }
});

// GET tasks
server.route({
  method: 'GET',
  path: '/api/tasks',
  handler: async (request, reply) => {
    const requestData = request.query;

    let response;
    let result = {};
    let limit = requestData.limit || 5;
    let offset = (requestData.page || 0) * limit;

    if (requestData.author) {
      await User.findOne({
        where: {
          [Op.or]: [
            {name: requestData.author},
            {surname: requestData.author},
            {email: requestData.author},
            {userId: parseInt(requestData.author, 10) || -1}
          ]
        }
      }).then(async (user) => {
        if (!user) {
          response = reply.response('Specified author is absent in DB').code(404);
        } else {
          await Task.findAndCountAll({
            where: {
              authorUserId: user.userId,
              [Op.or]: [
                {name: requestData.name || ''},
                {description: requestData.description || ''},
                {mark: parseInt(requestData.mark, 10) || -1},
                {taskId: parseInt(requestData.taskId, 10) || -1},
                {status: requestData.status || {[Op.or]: ['active', 'inactive', 'declined', 'completed']}}
              ]
            },
            offset: offset,
            limit: limit,
            include: [
              {
                model: User,
                where: {userId: user.userId},
                as: 'author'
              },
              {
                model: User,
                as: 'Participants',
                through: {
                  model: TasksParticipants,
                }
              }
            ]
            }).then(tasks => {
              if (tasks.rows.length) {
                result.count = tasks.count;
                result.tasks = tasks.rows;
                result.limit = limit;
                result.offset = offset;

                response = reply.response(result).code(200);
              } else {
                response = reply.response('Nothing found').code(404);
              }
          }).catch(error => console.log(error));
        }
      });
    } else {
      await Task.findAndCountAll({
        where: {
          [Op.or]: [
            {name: requestData.name || ''},
            {description: requestData.description || ''},
            {mark: parseInt(requestData.mark, 10) || -1},
            {taskId: parseInt(requestData.taskId, 10) || -1},
            {status: requestData.status || {[Op.or]: ['active', 'inactive', 'declined', 'completed']}}
          ]
        },
        offset: offset,
        limit: limit,
        include: [
          {
            model: User,
            as: 'author'
          },
          {
            model: User,
            as: 'Participants',
            through: {
              model: TasksParticipants,
            }
          }
        ]
      }).then(tasks => {
        if (tasks.rows.length) {
          result.count = tasks.count;
          result.tasks = tasks.rows;
          result.limit = limit;
          result.offset = offset;

          response = reply.response(result).code(200);
        } else {
          response = reply.response('Nothing found').code(404);
        }
      }).catch(error => console.log(error));
    }

    return response;
  }
});

// GET projects
server.route({
  method: 'GET',
  path: '/api/projects',
  handler: async (request, reply) => {
    const requestData = request.query;

    let response;
    let result = {};
    let averageMarks = [];
    let limit = requestData.limit || 5;
    let offset = (requestData.page || 0) * limit;

    if (requestData.author) {
      await User.findOne({
        where: {
          [Op.or]: [
            {name: requestData.author},
            {surname: requestData.author},
            {email: requestData.author},
            {userId: parseInt(requestData.author, 10) || -1}
          ]
        }
      }).then(async (user) => {
        if (!user) {
          response = reply.response('Specified author is absent in DB').code(404);
        } else {
          await Project.findAndCountAll({
            where: {
              authorUserId: user.userId,
              [Op.or]: [
                {name: requestData.name || ''},
                {body: requestData.body || ''},
                {projectId: parseInt(requestData.projectId, 10) || -1},
                {status: requestData.status || {[Op.or]: ['active', 'inactive', 'declined', 'completed']}}
              ]
            },
            offset: offset,
            limit: limit,
            include: [
              {
                model: User,
                where: {userId: user.userId},
                as: 'author'
              },
              {
                model: Task,
                as: 'Tasks',
                through: {
                  model: ProjectsTasks,
                }
              }
            ]
          }).then(projects => {
            if (projects.rows) {
              result.count = projects.count;
              result.projects = projects.rows;
              result.limit = limit;
              result.offset = offset;
              result.averageMark = 0;

              projects.rows.forEach(project => {
                project.Tasks.forEach(task => {
                  if (task.status === 'completed') {
                    averageMarks.push(task.mark);
                  }
                });
              });

              if (averageMarks.length) {
                result.averageMark = averageMarks.reduce((a, b) => a + b) / averageMarks.length;
              }

              response = reply.response(result).code(200);
            } else {
              response = reply.response('Nothing found').code(404);
            }
          }).catch(error => console.log(error));
        }
      });
    } else {
      await Project.findAndCountAll({
        where: {
          [Op.or]: [
            {name: requestData.name || ''},
            {body: requestData.body || ''},
            {projectId: parseInt(requestData.projectId, 10) || -1},
            {status: requestData.status || {[Op.or]: ['active', 'inactive', 'declined', 'completed']}}
          ]
        },
        offset: offset,
        limit: limit,
        include: [
          {
            model: User,
            as: 'author'
          },
          {
            model: Task,
            as: 'Tasks',
            through: {
              model: ProjectsTasks,
            }
          }
        ]
      }).then(projects => {
        if (projects.rows) {
          result.count = projects.count;
          result.projects = projects.rows;
          result.limit = limit;
          result.offset = offset;
          result.averageMark = 0;

          projects.rows.forEach(project => {
            project.Tasks.forEach(task => {
              if (task.status === 'completed') {
                averageMarks.push(task.mark);
              }
            });
          });

          if (averageMarks.length) {
            result.averageMark = averageMarks.reduce((a, b) => a + b) / averageMarks.length;
          }

          response = reply.response(result).code(200);
        } else {
          response = reply.response('Nothing found').code(404);
        }
      }).catch(error => console.log(error));
    }

    return response;
  }
});

// POST user
server.route({
  method: 'POST',
  path: '/api/users',
  handler: async (request, reply) => {
    const requestData = request.payload;

    let response;

    if (!requestData.email || !requestData.name || !requestData.surname) {
      response = reply.response('Please specify user\'s email, name and surname').code(400);
      return response;
    }

    await User.findOne({ where: {email: requestData.email} }).then(async (user) => {
      if (user) {
        response = reply.response('The email address is already registered').code(400);
      } else {
        await User.create({ email: requestData.email, name: requestData.name, surname: requestData.surname });
        response = reply.response('User account has been created successfully').code(201);
      }
    });

    return response;
  }
});

// POST task
server.route({
  method: 'POST',
  path: '/api/tasks',
  handler: async (request, reply) => {
    const requestData = request.payload;

    let response;
    let taskId;

    if (!requestData.name || !requestData.description || !requestData.author || !requestData.participants || !requestData.mark || !requestData.status) {
      response = reply.response('Please specify task\'s characteristics: name, description, task author, task participants, mark and status (active/inactive/declined)').code(400);
      return response;
    }

    await User.findOne({
      where: {
        [Op.or]: [
          {name: requestData.author},
          {surname: requestData.author},
          {email: requestData.author}
        ]
      }
    }).then(async (user) => {
      if (!user) {
        response = reply.response('Specified author is absent in DB').code(400);
      } else {
        await Task.findOne({ where: {name: requestData.name} }).then(async (task) => {
          if (task) {
            response = reply.response('Specified task already exists in DB').code(400);
          } else {
            await Task.create({
              name: requestData.name,
              description: requestData.description,
              authorUserId: user.userId,
              mark: parseInt(requestData.mark, 10),
              status: requestData.status
            }).then(async (task) => {
              taskId = task.taskId;

              await TasksAuthors.create({ taskId: taskId, userId: user.userId });

              requestData.participants.forEach(async (participant) => {
                await User.findOne({
                  where: {
                    [Op.or]: [
                      {name: participant},
                      {surname: participant},
                      {email: participant}
                    ]
                  }
                }).then(async (user) => {
                  if (user) {
                    await TasksParticipants.create({ taskId: taskId, userId: user.userId });
                  }
                })
              });
            });

            response = reply.response('Task saved in DB').code(201);
          }
        });
      }
    });

    return response;
  }
});

// POST project
server.route({
  method: 'POST',
  path: '/api/projects',
  handler: async (request, reply) => {
    const requestData = request.payload;

    let response;
    let tasks;
    let projectId;

    if (!requestData.name || !requestData.body || !requestData.author || !requestData.tasks || !requestData.status) {
      response = reply.response('Please specify project\'s characteristics: name, body, project author, tasks and status (active/inactive/declined)').code(400);
      return response;
    }

    await User.findOne({
      where: {
        [Op.or]: [
          {name: requestData.author},
          {surname: requestData.author},
          {email: requestData.author}
        ]
      }
    }).then(async (user) => {
      if (!user) {
        response = reply.response('Specified author is absent in DB').code(400);
      } else {
        await Project.findOne({ where: {name: requestData.name} }).then(async (project) => {
          if (project) {
            response = reply.response('Specified project already exists in DB').code(400);
          } else {
            await Project.create({
              name: requestData.name,
              body: requestData.body,
              authorUserId: user.userId,
              status: requestData.status
            }).then(async (project) => {
              projectId = project.projectId;

              await ProjectsAuthors.create({ projectId: projectId, userId: user.userId });

              requestData.tasks.forEach(async (task) => {
                await Task.findOne({ where: {name: task} }).then(async (task) => {
                  if (task) {
                    await ProjectsTasks.create({ projectId: projectId, taskId: task.taskId });
                  }
                })
              });
            });

            response = reply.response('Project saved in DB').code(201);
          }
        });
      }
    });

    return response;
  }
});

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

User.sync();
Task.sync();
Project.sync();
TasksParticipants.sync();
ProjectsTasks.sync();
TasksAuthors.sync();
ProjectsAuthors.sync();

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

init();
