function lol(obj) {
    console.log(obj?.editions);
    console.log(parseInt(obj?.editions));
    switch (obj?.editions) {
        case 1:
            console.log('xd');
            break;
        case '1':
            console.log('roflmao');
            break;
    }

    console.log('here');
    switch (parseInt(obj?.editions)) {
        case 1:
            console.log('xd');
            break;
        case '1':
            console.log('roflmao');
            break;
    }
    console.log('end');

    const a = [];

    a.push({ ...obj });
    a.push(...obj);
}

lol({ editions: '1' });
