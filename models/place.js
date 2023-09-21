const mongoose = require('mongoose')
const schema = mongoose.Schema

const place = new schema({
    creator: { 
        //Provided by mongoose now
        type: mongoose.Types.ObjectId, 
        required: true,
        //Establish connection between another schema
        ref: 'User'
    },
    image: {
        type: String, 
        required: true
    },
    title: {
        type: String, 
        required: true
    },
    description: {
        type: String, 
        required: true
    },
    address: {
        type: String, 
        required: true
    },
    location: {
        lat: {
            type: Number, 
            required: true
        },
        long:{
            type: Number, 
            required: true
        } 
    }
})

place.set('toJSON', {getters: true})

//The versionKey is a property set on each document when first created by Mongoose. This keys value contains the internal revision of the document. The name of this document property is configurable. The default is __v.
module.exports = mongoose.model('Place', place)