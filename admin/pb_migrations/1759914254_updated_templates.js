/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7amth7pix3i8k5p")

  collection.listRule = "is_preset = true || public = true ||\n(@collection.orgAuthorizations.user.id ?= @request.auth.id &&\n @collection.orgAuthorizations.organization.id ?= organization.id &&\n (@collection.orgAuthorizations.role.name ?= \"admin\" || \n  @collection.orgAuthorizations.role.name ?= \"owner\"))"
  collection.viewRule = "is_preset = true || public = true ||\n(@collection.orgAuthorizations.user.id ?= @request.auth.id &&\n @collection.orgAuthorizations.organization.id ?= organization.id &&\n (@collection.orgAuthorizations.role.name ?= \"admin\" || \n  @collection.orgAuthorizations.role.name ?= \"owner\"))"

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7amth7pix3i8k5p")

  collection.listRule = "is_preset = true ||\n(@collection.orgAuthorizations.user.id ?= @request.auth.id &&\n @collection.orgAuthorizations.organization.id ?= organization.id &&\n (@collection.orgAuthorizations.role.name ?= \"admin\" || \n  @collection.orgAuthorizations.role.name ?= \"owner\"))"
  collection.viewRule = "is_preset = true ||\n(@collection.orgAuthorizations.user.id ?= @request.auth.id &&\n @collection.orgAuthorizations.organization.id ?= organization.id &&\n (@collection.orgAuthorizations.role.name ?= \"admin\" || \n  @collection.orgAuthorizations.role.name ?= \"owner\"))"

  return dao.saveCollection(collection)
})
