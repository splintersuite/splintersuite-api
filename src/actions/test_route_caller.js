import axios from 'axios';

axios
    .get('http://127.0.0.1:6900/api/users/hackinhukk')
    .then((data) => {
        console.log('returned data', data);
    })
    .catch((err) => {
        console.log('axios.post errored');
        console.log(err);
    });
