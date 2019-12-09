const MongoClient = require("mongodb").MongoClient;

exports.connect = () => {
  return new Promise((resolve, reject) => {
    // Connection URL
    const url = process.env["FH_MONGODB_CONN_URL"];

    // Database Name
    const dbName = "admin";

    // Create a new MongoClient
    const client = new MongoClient(url);

    // Use connect method to connect to the Server
    client.connect(function(err) {
      if (err){
          return reject(err);
      } else {
        console.log("Connected successfully to server");
        resolve(client.db(dbName))
      }
      
    });
  });
};
