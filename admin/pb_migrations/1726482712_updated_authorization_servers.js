/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("758huqg35n76ung")

  collection.indexes = [
    "CREATE UNIQUE INDEX `idx_qWCq11I` ON `authorization_servers` (\n  `name`,\n  `organization`\n)"
  ]

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("758huqg35n76ung")

  collection.indexes = []

  return dao.saveCollection(collection)
})
