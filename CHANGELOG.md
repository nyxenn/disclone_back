# Changelog


## 12/09/2020
### Added
- Mongoose schema 'Server'
- '/server' route
- 'login', 'get server members' routes to '/user'
- 'get servers for user', 'create server', 'join server' routes to '/server'
- mongoose-sequence for auto-incrementing ids
### Deleted
- Mongoose schemas 'Message' and 'Channel'


## 11/09/2020
### Added
- Connection to database
- Mongoose schema 'User'
- Express router to project with '/user' route
- 'register', 'get user by id' routes to '/user'
- bcrypt for hashing user passwords
