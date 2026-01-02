module.exports = {
    apps: [
        {
            name: 'asri-backend',
            script: '/home/luckyjayagroup/ltech/ltech-backend/bin/ltech-backend',
            cwd: '/home/luckyjayagroup/ltech/ltech-backend',
            interpreter: 'none',
            env: {
                GO_ENV: 'production'
            },
            env_file: '/home/luckyjayagroup/ltech/ltech-backend/.env.local',
            watch: false,
            max_memory_restart: '1G',
            error_file: '/home/luckyjayagroup/ltech/logs/backend-error.log',
            out_file: '/home/luckyjayagroup/ltech/logs/backend-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            autorestart: true
        },
        {
            name: 'asri-nginx',
            script: 'nginx',
            args: '-g "daemon off;" -c /home/luckyjayagroup/ltech/nginx-funnel.conf',
            interpreter: 'none',
            watch: false,
            autorestart: true,
            max_memory_restart: '200M',
            error_file: '/home/luckyjayagroup/ltech/logs/nginx-error.log',
            out_file: '/home/luckyjayagroup/ltech/logs/nginx-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true
        }
    ]
};
