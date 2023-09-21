const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')
const schema = mongoose.Schema

const user = new schema({
    name: { 
        type: String, 
        required: true
    },
    email: {
        type: String,
        unique: true, 
        required: true
    },
    password: {
        type: String, 
        required: true,
        minlength: true
    },
    image: {
        type: String, 
        required: true
    },
    //Array as a user can have multiple places
    places: [{
        //Provided by mongoose now
        type: mongoose.Types.ObjectId, 
        required: true,
        //Establish connection between another schema
        ref: 'Place'
    }]
})

user.plugin(uniqueValidator)
user.set('toJSON', {getters: true})

//The versionKey is a property set on each document when first created by Mongoose. This keys value contains the internal revision of the document. The name of this document property is configurable. The default is __v.
module.exports = mongoose.model('User', user)