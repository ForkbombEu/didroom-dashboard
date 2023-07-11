migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("xl2wr8ij9rnkug6")

  collection.listRule = "(@collection.authorizations.users.id ?= @request.auth.id || @collection.authorizations.owner.id = @request.auth.id) && @collection.authorizations.record_id = id"
  collection.viewRule = "(@collection.authorizations.users.id ?= @request.auth.id || @collection.authorizations.owner.id = @request.auth.id) && @collection.authorizations.record_id = id"

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("xl2wr8ij9rnkug6")

  collection.listRule = null
  collection.viewRule = null

  return dao.saveCollection(collection)
})
