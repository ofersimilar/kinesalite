var db = require('../../db')

module.exports = function removeTagsFromStream(requestMeta, logger, store, data, cb) {

  var metaDb = store.metaDb,
      streamName = data.StreamName,
      streamKey = store.streamKey({name: streamName, type: 'deliveryStream'})

  metaDb.lock(streamKey, function(release) {
    cb = release(cb)

    store.getStream(streamKey, function(err, stream) {
      if (err) return cb(err)

      if (data.TagKeys.some(function(key) { return /[^\u00C0-\u1FFF\u2C00-\uD7FF\w\.\/\-=+_ @%]/.test(key) }))
        return cb(db.clientError('InvalidArgumentException',
          'Some tags contain invalid characters. Valid characters: ' +
          'Unicode letters, digits, white space, _ . / = + - % @.'))

      if (data.TagKeys.some(function(key) { return ~key.indexOf('%') }))
        return cb(db.clientError('InvalidArgumentException',
          'Failed to remove tags from stream ' + streamName + ' under account ' + metaDb.awsAccountId +
          ' because some tags contained illegal characters. The allowed characters are ' +
          'Unicode letters, white-spaces, \'_\',\',\',\'/\',\'=\',\'+\',\'-\',\'@\'.'))

      data.TagKeys.forEach(function(key) {
        delete stream._tags[key]
      })

      metaDb.put(streamKey, stream, function(err) {
        if (err) return cb(err)

        cb()
      })
    })
  })
}
