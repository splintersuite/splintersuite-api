module.exports = {
    apps: [
        {
            name: 'splitersuite-api',
            script: 'index.js',
            cwd: '/home/ubuntu/splintersuite-api',
            instances: 'max',
            max_memory_restart: '256M',
            exec_mode: 'cluster',
            out_file: '../AppLogs/out.log',
            error_file: '../ErrorLogs/err.log',
            merge_logs: true,
            combine_logs: true,
            watch: false,
            env: {
                NODE_ENV: 'development',
            },
            env_production: {
                NODE_ENV: 'production',
            },
            kill_timeout: 3000, //default is 1600
        },
    ],
};
