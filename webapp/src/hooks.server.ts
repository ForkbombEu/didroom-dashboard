// SPDX-FileCopyrightText: 2024 The Forkbomb Company
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import * as Sentry from '@sentry/sveltekit';
import { sequence } from '@sveltejs/kit/hooks';
import { i18n } from '$lib/i18n';
import { handleCsrf } from '@kitql/handles';

/* Final */

Sentry.init({
	dsn: 'https://f1256ba86cba40e094cf988b4ce32aae@o822807.ingest.us.sentry.io/4505521418338304',
	replaysSessionSampleRate: 1,
	replaysOnErrorSampleRate: 1
});

export const handle = sequence(
	Sentry.sentryHandle(),
	sequence(i18n.handle()),
	handleCsrf([['/api/download-microservices', { origin: true }]])
);
export const handleError = Sentry.handleErrorWithSentry();
