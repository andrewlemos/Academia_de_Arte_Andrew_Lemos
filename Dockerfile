# Stage 1: Build the React frontend and compile the TypeScript Express backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package definition files
COPY package*.json ./

# Install ALL dependencies (including devDependencies like typescript, esbuild, vite)
RUN npm ci

# Copy all source files
COPY . .

# Run the build script (vite build && esbuild compilation)
RUN npm run build

# Stage 2: Create a lightweight, production-ready image
FROM node:20-alpine

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy package definition files and install ONLY production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled frontend and backend assets from Stage 1
COPY --from=builder /app/dist ./dist

# Copy the local database file (retains default data)
COPY --from=builder /app/data ./data

# Expose port 3000 (Cloud Run overrides this with the PORT env, but our server fallback is 3000)
EXPOSE 3000

# Start the Node.js production server
CMD ["npm", "start"]
