// SPDX-FileCopyrightText: 2024 The Forkbomb Company
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import AdmZip from 'adm-zip';
import { cleanUrl, createSlug } from './strings';
import type {
	AuthorizationServersResponse,
	IssuersResponse,
	RelyingPartiesResponse
} from '$lib/pocketbase/types';
import type { MicroserviceFolder } from '../shared-operations';

type DockerFiles = {
	dockerCompose: string;
	caddyfile: Record<string, unknown>;
	dependsOn: string;
};

const serviceNamePrefix = {
	authz_server: 'as',
	credential_issuer: 'ci',
	relying_party: 'rp'
};

export function startDockerCompose(): DockerFiles {
	return {
		dockerCompose: 'services:',
		caddyfile: {},
		dependsOn: ''
	};
}

export function endDockerCompose(zip: AdmZip, dockerComposeFiles: DockerFiles): void {
	dockerComposeFiles.dockerCompose += `
  caddy:
    depends_on: ${dockerComposeFiles.dependsOn}
    container_name: caddy
    image: caddy:alpine
    restart: unless-stopped
    ports:
      - 80:80
      - 443:443
      - "443:443/udp"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - ./site:/srv
      - caddy_data:/data
      - caddy_config:/config

volumes:
  caddy_data:
  caddy_config:
`;
	let caddyfileString = '';
	for (const [key, value] of Object.entries(dockerComposeFiles.caddyfile)) {
		caddyfileString += `${key} {${value}}\n`;
	}
	zip.addFile('docker-compose.yaml', Buffer.from(dockerComposeFiles.dockerCompose, 'utf-8'));
	zip.addFile('Caddyfile', Buffer.from(caddyfileString, 'utf-8'));
}

export function setupDockerCompose(
	dockerComposeFiles: DockerFiles,
	ms: AuthorizationServersResponse | IssuersResponse | RelyingPartiesResponse,
	msType: MicroserviceFolder
): void {
	const msName = createSlug(ms.name);
	const msUrl = cleanUrl(ms.endpoint);
	const serviceFullName = `${serviceNamePrefix[msType]}_${msName}`;
	dockerComposeFiles.dockerCompose += dockerComposeTemplate(serviceFullName, msUrl, msType);
	dockerComposeFiles.dependsOn += `\n      ${serviceFullName}:\n        condition: service_started`;
	const [protocol, _, host] = msUrl.split('/');
	const msBaseUrl = protocol + '//' + host;
	if (!dockerComposeFiles.caddyfile[msBaseUrl])
		dockerComposeFiles.caddyfile[msBaseUrl] = caddyfileTemplate(serviceFullName, msType);
	else dockerComposeFiles.caddyfile[msBaseUrl] += caddyfileTemplate(serviceFullName, msType);
}

function dockerComposeTemplate(
	serviceFullName: string,
	msUrl: string,
	msType: MicroserviceFolder
): string {
	let entrypoint = '';
	if (msType == 'authz_server')
		entrypoint = '\n    entrypoint: sh -c "make -C /app authorize && ./ncr"';
	return `
  ${serviceFullName}:
    container_name: ${serviceFullName}
    image: ghcr.io/forkbombeu/didroom_microservices:stable${entrypoint}
    environment:
      MS_URL: ${msUrl}
      MS_NAME: ${serviceFullName}
      ZENCODE_DIR: /app/${msType}
      PUBLIC_DIR: /app/public/${msType}
      BASEPATH: /${msType}
    volumes:
    - type: bind
      source: ./${serviceFullName}/${msType}
      target: /app/${msType}
    - type: bind
      source: ./${serviceFullName}/public
      target: /app/public
    - type: bind
      source: ~/.config/didroom
      target: /root/.config/didroom
`;
}

function caddyfileTemplate(serviceFullName: string, msType: MicroserviceFolder): string {
	return `
	reverse_proxy /${msType}/* ${serviceFullName}:3000
`;
}
