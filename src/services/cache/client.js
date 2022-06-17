import util from 'util';
import redis from 'redis';

const client = redis.createClient(process.env.REDIS_URL);
client.get = util.promisify(client.get);
client.set = util.promisify(client.set);
client.del = util.promisify(client.del);
client.expire = util.promisify(client.expire);

export default client;
