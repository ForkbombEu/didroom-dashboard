/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("0fg9n15rb903u1q")

  collection.options = {
    "query": "SELECT\n  services.id,\n  services.type_name,\n  services.logo,\n  authorization_servers.endpoint AS authorization_server,\n  issuers.endpoint as credential_issuer,\n  organizations.name as organization,\n  organizations.avatar as organization_logo\nFROM\n  services\nLEFT JOIN\n  authorization_servers on services.authorization_server = authorization_servers.id\nLEFT JOIN\n  issuers on services.credential_issuer = issuers.id\nLEFT JOIN\n  organizations on services.organization = organizations.id"
  }

  // remove
  collection.schema.removeField("l0jbarbu")

  // remove
  collection.schema.removeField("bwavfls9")

  // remove
  collection.schema.removeField("cag9mxqn")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "flmayjgb",
    "name": "type_name",
    "type": "text",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": "^[a-zA-Z0-9_]+$"
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "sdndeo7v",
    "name": "logo",
    "type": "url",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "exceptDomains": [],
      "onlyDomains": []
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "qpd5eloj",
    "name": "authorization_server",
    "type": "url",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "exceptDomains": [],
      "onlyDomains": []
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "thlqjdqn",
    "name": "credential_issuer",
    "type": "url",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "exceptDomains": [],
      "onlyDomains": []
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hiysyx0i",
    "name": "organization",
    "type": "text",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "min": 2,
      "max": null,
      "pattern": ""
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "i6jbkdzv",
    "name": "organization_logo",
    "type": "file",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "mimeTypes": [
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/svg+xml"
      ],
      "thumbs": [],
      "maxSelect": 1,
      "maxSize": 5242880,
      "protected": false
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("0fg9n15rb903u1q")

  collection.options = {
    "query": "SELECT\n  services.id,\n  services.type_name,\n  authorization_servers.endpoint AS authorization_server_endpoint,\n  issuers.endpoint as credential_issuer_endpoint\nFROM\n  services\nLEFT JOIN\n  authorization_servers on services.authorization_server = authorization_servers.id\nLEFT JOIN\n  issuers on services.credential_issuer = issuers.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "l0jbarbu",
    "name": "type_name",
    "type": "text",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": "^[a-zA-Z0-9_]+$"
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "bwavfls9",
    "name": "authorization_server_endpoint",
    "type": "url",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "exceptDomains": [],
      "onlyDomains": []
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "cag9mxqn",
    "name": "credential_issuer_endpoint",
    "type": "url",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "exceptDomains": [],
      "onlyDomains": []
    }
  }))

  // remove
  collection.schema.removeField("flmayjgb")

  // remove
  collection.schema.removeField("sdndeo7v")

  // remove
  collection.schema.removeField("qpd5eloj")

  // remove
  collection.schema.removeField("thlqjdqn")

  // remove
  collection.schema.removeField("hiysyx0i")

  // remove
  collection.schema.removeField("i6jbkdzv")

  return dao.saveCollection(collection)
})
