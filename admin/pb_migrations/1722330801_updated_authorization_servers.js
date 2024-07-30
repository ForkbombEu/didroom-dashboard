/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("758huqg35n76ung")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "5m3jqdgp",
    "name": "port",
    "type": "number",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "min": 33000,
      "max": 65000,
      "noDecimal": true
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("758huqg35n76ung")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "5m3jqdgp",
    "name": "port",
    "type": "number",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "min": 33000,
      "max": null,
      "noDecimal": true
    }
  }))

  return dao.saveCollection(collection)
})
