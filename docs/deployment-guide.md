# Deployment Guide

## Local Development

1. Install Node.js.
2. Clone the repository.
3. Install frontend dependencies.
4. Install backend dependencies.
5. Run the API server.
6. Run the React app.

## Production Recommendations

- Use Docker for containerization.
- Deploy frontend on Vercel or Netlify.
- Deploy backend on Render, Railway, or Azure App Service.
- Use PostgreSQL for persistent saved views.

## Security Notes

- Do not store uploaded CSV content in long-term storage unless needed.
- Sanitize file upload input.
- Limit file size for public endpoints.
- Use environment variables for API keys.
