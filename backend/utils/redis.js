import Redis from 'ioredis';

const redis = new Redis({
    host: process.env.REDIS_HOST,
    port:Number(process.env.REDIS_PORT),
    username:process.env.REDIS_USERNAME,
    password:process.env.REDIS_PASSWORD,
    // tls:{}
})

redis.set("testKey", "hello", (err) => {
  if (err) console.error("Set failed:", err);
  else console.log("Redis is working!");
});


redis.on("error", (err) => {
  console.error("Redis error:", err);
});

export default redis;