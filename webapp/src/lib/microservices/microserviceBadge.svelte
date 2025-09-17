<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import type { BadgeColor } from '$lib/components/utils/badge';
	import { m } from '$lib/i18n';
	import { Badge } from 'flowbite-svelte';
	import type { MicroserviceType } from '.';

	export let type: MicroserviceType;

	const colors: Record<MicroserviceType, BadgeColor> = {
		issuers: 'green',
		authorization_servers: 'blue',
		relying_parties: 'yellow'
	};

	const strings: Record<MicroserviceType, string> = {
		issuers: m.Credential_issuer(),
		authorization_servers: m.Authorization_server(),
		relying_parties: m.Verifier()
	};

	$: color = colors[type];
	$: string = strings[type];
</script>

<Badge {color}>{string}</Badge>
