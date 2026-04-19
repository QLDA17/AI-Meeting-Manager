# MultiMinutes AI - Deployment Guide

## Tổng Quan
Hướng dẫn triển khai MultiMinutes AI sử dụng Docker và Docker Compose.

## Yêu Cầu Hệ Thống

### Phần Cứng
- CPU: 2 cores trở lên
- RAM: 4GB trở lên (khuyên nghị 8GB)
- Disk: 20GB trở lên
- Network: Kết nối internet ổn định

### Phần Mềm
- Docker 20.10+
- Docker Compose 2.0+
- Git (để clone repository)

## Cài Đặt Docker

### Linux (Ubuntu/Debian)
```bash
# Cài đặt Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Cài đặt Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Thêm user vào docker group
sudo usermod -aG docker $USER
newgrp docker
```

### macOS
```bash
# Sử dụng Homebrew
brew install --cask docker
# Hoặc tải Docker Desktop từ: https://www.docker.com/products/docker-desktop
```

### Windows
```bash
# Tải Docker Desktop từ: https://www.docker.com/products/docker-desktop
# Chạy installer và khởi động Docker Desktop
```

## Chuẩn Bị Deployment

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/multiminutes-ai.git
cd multiminutes-ai
```

### 2. Cấu hình Environment Variables
```bash
# Copy file example
cp .env.example .env

# Chỉnh sửa .env file với các giá trị thực tế
nano .env
```

### 3. Environment Variables Cần Thiết
```env
# Database
DATABASE_URL=mysql+pymysql://multiminutes:multiminutes_password@db:3306/multiminutes

# Redis
REDIS_URL=redis://redis:6379/0

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@multiminutes.ai

# Frontend URL
FRONTEND_URL=http://localhost:5173

# API Keys
OPENAI_API_KEY=your-openai-api-key
GOOGLE_API_KEY=your-google-api-key
HUGGINGFACE_API_KEY=your-huggingface-api-key
```

## Deployment với Docker Compose

### 1. Build Images
```bash
docker-compose build
```

### 2. Start Services
```bash
docker-compose up -d
```

### 3. Kiểm Tra Status
```bash
docker-compose ps
```

### 4. Xem Logs
```bash
# Tất cả services
docker-compose logs -f

# Service cụ thể
docker-compose logs -f backend
docker-compose logs -f db
docker-compose logs -f redis
```

### 5. Dừng Services
```bash
docker-compose down
```

### 6. Dừng và Xóa Volumes
```bash
docker-compose down -v
```

## Truy Cập Services

### Frontend
- URL: http://localhost:80
- hoặc: http://localhost:5173 (nếu chạy frontend trực tiếp)

### Backend API
- URL: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

### Database (MySQL)
- Host: localhost
- Port: 3306
- Database: multiminutes
- User: multiminutes
- Password: multiminutes_password

### pgAdmin
- URL: http://localhost:5050
- Email: admin@multiminutes.ai
- Password: admin123

### Redis
- Host: localhost
- Port: 6379

## Database Migration

### Tự động khi khởi động
Schema sẽ được tự động chạy khi container MySQL khởi động lần đầu.

### Chạy migration thủ công
```bash
docker-compose exec db psql -U multiminutes -d multiminutes -f /docker-entrypoint-initdb.d/schema.sql
```

## Backup và Restore

### Backup Database
```bash
# Backup MySQL
docker-compose exec db mysqldump -u multiminutes -pmultiminutes_password multiminutes > backup.sql

# Backup volumes
docker run --rm -v multiminutes_mysql-data:/data -v $(pwd):/backup alpine tar czf /backup/mysql-backup.tar.gz /data
```

### Restore Database
```bash
# Restore MySQL
docker-compose exec -T db mysql -u multiminutes -pmultiminutes_password multiminutes < backup.sql

# Restore volumes
docker run --rm -v multiminutes_mysql-data:/data -v $(pwd):/backup alpine tar xzf /backup/mysql-backup.tar.gz -C /
```

## Scaling

### Scale Backend Services
```bash
docker-compose up -d --scale backend=3
```

### Sử dụng Nginx Load Balancer
```bash
# Thêm nginx service vào docker-compose.yml
# Cấu hình load balancing trong nginx.conf
```

## Monitoring

### Health Checks
```bash
# Backend health
curl http://localhost:8000/health

# Database health
docker-compose exec db pg_isready -U multiminutes

# Redis health
docker-compose exec redis redis-cli ping
```

### Logs Monitoring
```bash
# Xem logs real-time
docker-compose logs -f --tail=100

# Xem logs của service cụ thể
docker logs -f multiminutes-backend
docker logs -f multiminutes-db
```

## Security

### Update Dependencies
```bash
# Rebuild với dependencies mới nhất
docker-compose build --no-cache
docker-compose up -d
```

### Firewall Configuration
```bash
# Chỉ cho phép các port cần thiết
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### SSL/TLS Configuration
```bash
# Sử dụng Let's Encrypt cho production
# Cài đặt certbot
sudo apt-get install certbot python3-certbot-nginx

# Lấy certificate
sudo certbot --nginx -d yourdomain.com
```

## Production Deployment

### 1. Sử dụng Cloud Provider
- AWS (ECS, RDS, ElastiCache)
- Google Cloud (GKE, Cloud SQL, Memorystore)
- Azure (AKS, Azure SQL, Azure Cache)
- DigitalOcean (App Platform, Managed Databases)

### 2. CI/CD Pipeline
- GitHub Actions
- GitLab CI
- CircleCI
- Jenkins

### 3. Environment Variables Production
```env
# Production database
DATABASE_URL=mysql+pymysql://user:password@production-db:3306/multiminutes

# Production Redis
REDIS_URL=redis://production-redis:6379/0

# Production email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxx

# Production API keys
OPENAI_API_KEY=sk-prod-xxxxx
GOOGLE_API_KEY=AIzaSy-xxxxx

# Production URLs
FRONTEND_URL=https://multiminutes.ai
```

### 4. Production Docker Compose
```yaml
version: '3.8'

services:
  backend:
    image: multiminutes-backend:latest
    environment:
      - NODE_ENV=production
    restart: always
    # ... production configuration
```

## Troubleshooting

### Container không khởi động
```bash
# Xem logs
docker-compose logs backend

# Kiểm tra container status
docker-compose ps

# Rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Database connection errors
```bash
# Kiểm tra database status
docker-compose exec db pg_isready -U multiminutes

# Restart database
docker-compose restart db

# Xem database logs
docker-compose logs db
```

### Permission errors
```bash
# Fix file permissions
sudo chown -R $USER:$USER ./data ./logs ./uploads ./exports

# Set proper permissions
chmod 755 ./data ./logs ./uploads ./exports
```

## Performance Optimization

### Resource Limits
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Caching
- Redis cho session caching
- Nginx cho static file caching
- Database query caching

### Load Balancing
- Sử dụng multiple backend instances
- Configure nginx as load balancer
- Use AWS ELB or equivalent

## Update và Maintenance

### Update Application
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

### Scheduled Maintenance
```bash
# Backup trước khi maintenance
./backup.sh

# Stop services
docker-compose down

# Perform maintenance
# ...

# Restart services
docker-compose up -d
```

## Support

### Logs Collection
```bash
# Export all logs
docker-compose logs > logs-$(date +%Y%m%d).txt

# Archive logs
tar -czf logs-$(date +%Y%m%d).tar.gz logs/
```

### Contact Support
- Email: support@multiminutes.ai
- Documentation: https://docs.multiminutes.ai
- Issues: https://github.com/yourusername/multiminutes-ai/issues
