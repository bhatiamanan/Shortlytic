# Advanced URL Shortener API

An advanced URL shortener service with comprehensive analytics, custom aliases, and caching for performance optimization. This API supports user authentication via Google Sign-In and provides detailed analytics for URL performance.

---

## Features

1. **User Authentication**
   - Authenticate users using Google Sign-In.

2. **URL Shortening**
   - Create short URLs for long links with optional custom aliases and topics.

3. **Redirect Short URLs**
   - Redirect users to the original URL while tracking engagement analytics.

4. **Detailed Analytics**
   - Track clicks, unique users, operating systems, and devices for short URLs.
   - Retrieve topic-based and overall analytics for user-created URLs.

5. **Caching**
   - Optimize performance by caching short and long URLs in Redis.

---

## API Endpoints

### **User Authentication**

1. **Google Sign-In**
   - `POST /api/auth/google` - Initiate authentication.
   - `POST /api/auth/google/callback` - Handle callback after Google authentication.

### **Short URL APIs**

1. **Create Short URL**
   - `POST /api/shorten`
   - **Request Body**:
     ```json
     {
       "longUrl": "string",
       "customAlias": "string (optional)",
       "topic": "string (optional)"
     }
     ```
   - **Response**:
     ```json
     {
       "shortUrl": "string",
       "createdAt": "datetime"
     }
     ```

2. **Redirect Short URL**
   - `GET /api/shorten/{alias}` - Redirects to the long URL associated with the alias.

### **Analytics APIs**

1. **Fetch Analytics for a Short URL**
   - `GET /api/analytics/{alias}` - Retrieve detailed analytics for a specific short URL.

2. **Topic-Based Analytics**
   - `GET /api/analytics/topic/{topic}` - Fetch analytics for all URLs under a specified topic.

3. **Overall Analytics**
   - `GET /api/analytics/overall` - Retrieve aggregated analytics for all user-created URLs.

---

## Swagger Documentation

- Visit `/api-docs/` to explore the Swagger API documentation.

---
