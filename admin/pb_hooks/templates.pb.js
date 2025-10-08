// SPDX-FileCopyrightText: 2024 The Forkbomb Company
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// @ts-check

/// <reference path="../pb_data/types.d.ts" />
/** @typedef {import('./utils.js')} Utils */
/** @typedef {import('./auditLogger.js')} AuditLogger */
/** @typedef {import('../../webapp/src/lib/pocketbase/types.js').TemplatesRecord} Template  */

//

onRecordBeforeUpdateRequest((e) => {
    /** @type {Utils} */
    const utils = require(`${__hooks}/utils.js`);

    if (utils.isAdminContext(e.httpContext)) {
        return;
    }

    /** @type {(keyof Template)[]} */
    const notEditableFields = ["organization", "type", "is_preset"];

    const updatedFields = utils.getRecordUpdateEventDiff(e).map((d) => d.field);
    const invalidUpdatedFields = notEditableFields.filter((field) =>
        updatedFields.includes(field)
    );

    if (invalidUpdatedFields.length > 0)
        throw new ForbiddenError(
            utils.errors.cannot_update_template_protected_fields,
            invalidUpdatedFields
        );
}, "templates");
