var express = require('express');
var mbaasApi = require('fh-mbaas-api');
var mbaasExpress = mbaasApi.mbaasExpress();
var Promise = require('bluebird');
var sync = require('./lib/sync');
const db = require('./lib/db');
const { subscriptionServer } = require('./lib/subscriptions')
const { appTypeDefs, appResolvers } = require('./lib/schema')
const { VoyagerServer } = require('@aerogear/voyager-server')
const pushClient = null;
const bodyParser = require('body-parser');

// Initialise sync, define custom handlers, and interceptors
Promise.resolve()
  .then(() => sync.init())
  .then(async () => {
    const client = await db.connect();
    const apolloConfig = {
      typeDefs: appTypeDefs,
      resolvers: appResolvers,
      playground: false,
      context: ({
        req
      }) => {
        // pass request + db ref into context for each resolver
        return {
          req: req,
          db: client,
          pushClient: null
        }
      },
      uploads: {
        // Limits here should be stricter than config for surrounding
        // infrastructure such as Nginx so errors can be handled elegantly by
        // graphql-upload:
        // https://github.com/jaydenseric/graphql-upload#type-uploadoptions
        maxFileSize: 10000000, // 10 MB
        maxFiles: 5
      }
    }
  
    const voyagerConfig = {
      securityService: null,
      metrics: null,
      auditLogger: null
    }
    var app = express();
    app.use(bodyParser());
    const apolloServer = VoyagerServer(apolloConfig, voyagerConfig)
    apolloServer.applyMiddleware({
      app
    })
    // Securable endpoints: list the endpoints which you want to make securable here
    var securableEndpoints = [];

  

    // Note: the order which we add middleware to Express here is important!
    app.use('/sys', mbaasExpress.sys(securableEndpoints));
    app.use('/mbaas', mbaasExpress.mbaas);

    // Note: important that this is added just before your own Routes
    app.use(mbaasExpress.fhmiddleware());

    // Add extra routes here

    // Important that this is last!
    app.use(mbaasExpress.errorHandler());

    var port = process.env.FH_PORT || process.env.OPENSHIFT_NODEJS_PORT || 8001;
    var host = process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';
    var server = app.listen(port, host, function() {
      console.log("App started at: " + new Date() + " on port: " + port); 
      subscriptionServer(null, app, apolloServer)
    });
  })
  .catch((err) => {
    console.error('failed to start application', err);
    process.exit(1);
  });
