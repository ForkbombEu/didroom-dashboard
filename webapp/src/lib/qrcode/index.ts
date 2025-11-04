// SPDX-FileCopyrightText: 2024 The Forkbomb Company
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import qrcode from 'qrcode-generator';

type CredentialConfig = {
	credential_configuration_ids: string[];
	credential_issuer: string;
	grants: {
		authorization_code: {
			authorization_server: string;
		}
	} | undefined;
};

export function createIntentUrl(data: CredentialConfig): string {
	const credentialOffer = encodeURIComponent(JSON.stringify(data));
	return `openid-credential-offer://?credential_offer=${credentialOffer}`;
}

export function generateQr(text: string, cellSize = 20) {
	const qr = qrcode(0, 'L');
	qr.addData(text);
	qr.make();
	return qr.createDataURL(cellSize);
}
