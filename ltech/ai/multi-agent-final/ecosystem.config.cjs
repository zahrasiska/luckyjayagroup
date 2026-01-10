module.exports = {
  apps: [
    {
      name: 'multi-agent-backend',
      script: 'server.js',
      cwd: '/home/luckyjayagroup/ltech/ai/multi-agent-final',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 8899
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8899
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    },
    {
      name: 'multi-agent-frontend',
      script: 'npm',
      args: 'run dev',
      cwd: '/home/luckyjayagroup/ltech/ai/multi-agent-final/frontend',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'development'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    }
  ]
};
