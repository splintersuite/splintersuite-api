const { client } = require('./client');

async function test() {
  client.set('key', JSON.stringify([{ color: 'rojo' }, { color: 'azul' }]));
  client.expire('key', 3);

  client.set('key', JSON.stringify([{ color: 'rojo' }, { color: 'azul' }]));
  const v = await client.get('key');
  console.log(v);

  setTimeout(async () => {
    const v = await client.get('key');
    console.log(v);
  }, 5000)
}

// test();
