import { MongoMemoryServer } from 'mongodb-memory-server';

async function run() {
  try {
    const mongod = await MongoMemoryServer.create({ instance: { port: 27017 } });
    console.log(`MongoDB Memory Server successfully started on ${mongod.getUri()}`);
    // Keep process alive
    setInterval(() => {}, 1000 * 60 * 60);
  } catch (err) {
    console.error('Failed to start MongoMemoryServer', err);
  }
}
run();
