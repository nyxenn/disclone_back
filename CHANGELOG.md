# Changelog

## 21/09/2020
### Added
- Mongoose schemas 'Conversation', 'Request'
- '/conv', '/req' routes
- Added cors to project
- Get conversations by user id
- Get conversation history by conversation id
- Get friend requests for user
- Delete friend request for user
- Get friends for user
- Accept friend request for user

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
