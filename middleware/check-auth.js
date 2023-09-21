const HttpError = require('../models/http-error')
const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
    //Can encode into url as query params(what comes after ?=...) as a valid way of sending a token. But we'll send as encoding to headers of incoming request instead to keep url cleaner
    //Authorization: 'Bearer TOKEN' by convention as a string, indicating it bears a token. Hence taking value after ' ' only
    if(req.method === 'OPTIONS'){
        return next()
    }
    try{
        const token = req.headers.authorization?.split(" ")[1];
        if(!token){
            throw new Error('Authentication failed')
        }
        //Synchronously verify given token using a secret or a public key to get a decoded token token. Ti returns a string / object payload encoded into token. Into token, we stored userId and email. Hence can be extracted here. It reached at this point, can call next() to continue with other routes further
        const decodedToken = jwt.verify(token, process.env.JWT_KEY)
        //Can dynamically add userData like this
        req.userData = {userId: decodedToken.userId}
        next()
    }
    catch(err){
        return next(new HttpError('Authentication failed', 403))
    }
}