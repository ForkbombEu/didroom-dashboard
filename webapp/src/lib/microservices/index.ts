// SPDX-FileCopyrightText: 2024 The Forkbomb Company
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Collections } from '$lib/pocketbase/types';
import type {
	RelyingPartiesResponse,
	AuthorizationServersResponse,
	IssuersResponse
} from '$lib/pocketbase/types';

//

export type Microservices = {
	[Collections.RelyingParties]: RelyingPartiesResponse;
	[Collections.AuthorizationServers]: AuthorizationServersResponse;
	[Collections.Issuers]: IssuersResponse;
};

export type MicroserviceType = keyof Microservices;
export type Microservice = Microservices[MicroserviceType];

//

export function getRandomMicroservicePort() {
	const MIN_PORT = 33000;
	const MAX_PORT = 34000;
	return MIN_PORT + Math.floor(Math.random() * (MAX_PORT - MIN_PORT));
}

//

export function cleanUrl(url: string) {
	return url.replace(/\/$/, '');
}

export function formatMicroserviceUrl(url: string, microservice: string) {
	return appendMicroserviceFolderToUrl(cleanUrl(url), microservice);
}

function appendMicroserviceFolderToUrl(url: string, microservice: string) {
	const toAppend = `/${microservice}`;
	if (!url.endsWith(toAppend)) return `${url}${toAppend}`;
	else return url;
}