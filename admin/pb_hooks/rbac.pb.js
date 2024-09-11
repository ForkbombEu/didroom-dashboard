// SPDX-FileCopyrightText: 2024 The Forkbomb Company
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// @ts-check

/// <reference path="../pb_data/types.d.ts" />
/** @typedef {import('./utils.js')} Utils */
/** @typedef {import("../../webapp/src/lib/pocketbase/types").OrgAuthorizationsRecord} OrgAuthorization */
/** @typedef {import("../../webapp/src/lib/pocketbase/types").OrgRolesResponse} OrgRole */

//

onRecordAfterCreateRequest((e) => {
    console.log("Hook - Creating owner role for new organization");

    // Don't create auth if organization is created from admin panel
    if ($apis.requestInfo(e.httpContext).admin) return;

    /** @type {Utils} */
    const utils = require(`${__hooks}/utils.js`);

    const userId = utils.getUserFromContext(e.httpContext)?.getId();
    const organizationId = e.record?.getId();

    const ownerRole = utils.getRoleByName("owner");
    const ownerRoleId = ownerRole?.getId();

    const collection = $app.dao().findCollectionByNameOrId("orgAuthorizations");
    const record = new Record(collection, {
        organization: organizationId,
        role: ownerRoleId,
        user: userId,
    });
    $app.dao().saveRecord(record);
}, "organizations");

//

onRecordBeforeDeleteRequest((e) => {
    console.log("Hook - Checking if deleting owner role is possible");

    /** @type {Utils} */
    const utils = require(`${__hooks}/utils.js`);

    if (e.record && utils.isLastOwnerAuthorization(e.record)) {
        throw new Error("Can't remove the last owner role!");
    }
}, "orgAuthorizations");

//

routerAdd("POST", "/verify-org-authorization", (c) => {
    console.log("Route - Checking if user has the correct org authorization");

    /** @type {Utils} */
    const utils = require(`${__hooks}/utils.js`);

    const userId = utils.getUserFromContext(c)?.getId();
    if (!userId) throw new Error("User must be logged!");

    /**  @type {{organizationId: string, url: string}} */
    // @ts-ignore
    const { organizationId, url } = $apis.requestInfo(c).data;
    if (!organizationId || !url) throw new Error("Missing data in request");

    const userAuthorization = $app
        .dao()
        .findFirstRecordByFilter(
            "orgAuthorizations",
            `organization="${organizationId}" && user="${userId}"`
        );
    // Here we assume that there is only one role for each organization
    // Also enforced by API rules
    if (!userAuthorization) throw new Error("Not authorized");
    const userRole = userAuthorization.get("role");

    const protectedPaths = utils.findRecordsByFilter(
        "orgProtectedPaths",
        "pathRegex != ''"
    );

    const matchingPaths = protectedPaths.filter((p) => {
        const regex = new RegExp(p?.get("pathRegex") ?? "");
        return regex.test(url);
    });

    const isAllowed = matchingPaths
        .map((p) => {
            /** @type {string[]} */
            const roles = p?.get("roles");
            return roles;
        })
        .every((roles) => roles.includes(userRole));

    if (!isAllowed) throw new Error("Not authorized");
});

//

routerAdd("POST", "/verify-user-role", (c) => {
    console.log("Route - Checking if user has the required role");

    /** @type {Utils} */
    const utils = require(`${__hooks}/utils.js`);

    const userId = utils.getUserFromContext(c)?.getId();
    if (!userId) throw new Error("User must be logged!");

    /** @type {{organizationId: string, roles: string[]}}*/
    // @ts-ignore
    const { organizationId, roles } = $apis.requestInfo(c).data;
    if (!organizationId || !roles || roles.length === 0)
        throw new Error("Missing data in request");

    const roleFilter = `( ${roles
        .map((r) => `role.name="${r}"`)
        .join(" || ")} )`;

    const userAuthorization = $app
        .dao()
        .findFirstRecordByFilter(
            "orgAuthorizations",
            `organization="${organizationId}" && user="${userId}" && ${roleFilter}`
        );
    // Here we assume that there is only one role for each organization
    // Also enforced by API rules
    if (!userAuthorization) throw new Error("Not authorized");
});

//

onRecordBeforeUpdateRequest((e) => {
    /** @type {Utils} */
    const utils = require(`${__hooks}/utils.js`);

    // Getting previous role

    const originalAuthorization = e.record?.originalCopy();
    if (!originalAuthorization) throw new Error();
    // @ts-ignore
    $app.dao().expandRecord(originalAuthorization, ["role"], null);
    const previousRole = originalAuthorization.expandedOne("role");

    // Getting requested role

    /** @type {Partial<OrgAuthorization>} */
    const { role: newRoleId } = $apis.requestInfo(e.httpContext).data;
    if (!newRoleId) throw new Error();
    const newRole = $app.dao().findRecordById("orgRoles", newRoleId);

    // Getting role of user requesting the change

    /** @type {string} */
    const organizationId = e.record?.get("organization");

    const requestingUserId = utils.getUserFromContext(e.httpContext)?.getId();
    const requestingUserAuthorization = $app
        .dao()
        .findFirstRecordByFilter(
            "orgAuthorizations",
            `organization="${organizationId}" && user="${requestingUserId}"`
        );
    // @ts-ignore
    $app.dao().expandRecord(requestingUserAuthorization, ["role"], null);
    const requestingUserRole = requestingUserAuthorization.expandedOne("role");

    // Role order

    /** @type {number} */
    const previousRoleLevel = previousRole.get("level");
    /** @type {number} */
    const newRoleLevel = newRole.get("name");
    /** @type {number} */
    const requestingUserRoleLevel = requestingUserRole.get("level");

    const isChangeAllowed =
        // The previous role cannot be higher than the one of the user requesting the change
        requestingUserRoleLevel < previousRoleLevel &&
        // The new role cannot be higher than the one of the user requesting the change
        requestingUserRoleLevel < newRoleLevel;

    if (!isChangeAllowed) throw new ForbiddenError("NOT_ENOUGH_PRIVILEGES");
}, "orgAuthorizations");

// TODO - Owner cannot leave its role if there are no other owners

onRecordBeforeUpdateRequest((e) => {
    console.log("Hook - Checking if editing owner role is possible");

    /** @type {Utils} */
    const utils = require(`${__hooks}/utils.js`);

    if (e.record && utils.isLastOwnerAuthorization(e.record)) {
        throw new Error("Can't edit the last owner role!");
    }
}, "orgAuthorizations");
