// SPDX-FileCopyrightText: 2024 The Forkbomb Company
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import AdmZip from 'adm-zip';
import { pipe } from 'effect';

//

function getZipEntry(zip: AdmZip, entryPathFragment: string) {
	return zip.getEntries().find((entry) => entry.entryName.includes(entryPathFragment));
}

function editZipEntry(zip: AdmZip, entry: AdmZip.IZipEntry, content: string) {
	zip.updateFile(entry, Buffer.from(content));
}

function readZipEntryAsString(entry: AdmZip.IZipEntry) {
	return entry.getData().toString();
}

export function update_zip_entry(
	zip: AdmZip,
	pathFragment: string,
	updater: (content: string) => string
) {
	const zipEntry = getZipEntry(zip, pathFragment);
	if (!zipEntry) throw new Error(`Zip: Not found: ${pathFragment}`);
	const newContent = updater(readZipEntryAsString(zipEntry));
	editZipEntry(zip, zipEntry, newContent);
}

export function update_zip_json_entry(
	zip: AdmZip,
	pathFragment: string,
	updater: (content: Record<string, unknown>) => Record<string, unknown>,
	tabSize = 4
) {
	update_zip_entry(zip, pathFragment, (content) =>
		pipe(content, JSON.parse, updater, (content) => JSON.stringify(content, null, tabSize))
	);
}

export function copy_and_modify_zip_entry(
	zip: AdmZip,
	entryPathFragment: string,
	destinationPathFragment: string,
	updater: (content: string) => string
) {
	const zipEntry = getZipEntry(zip, entryPathFragment);
	if (!zipEntry) throw new Error(`Zip: Not found: ${entryPathFragment}`);
	const newContent = updater(readZipEntryAsString(zipEntry));
	zip.addFile(prepend_zip_root_folder(zip, destinationPathFragment), Buffer.from(newContent));
}

export function delete_zip_folder(zip: AdmZip, folder_path: string) {
	zip.deleteFile(folder_path);
}

export function addZipAsSubfolder(
	base_zip: AdmZip,
	sub_zip: AdmZip,
	folder_name: string | undefined = undefined
): AdmZip {
	sub_zip.getEntries().forEach((e) => {
		let path = e.entryName;
		if (folder_name) path = renamePathSegmentAtIndex(path, folder_name, 0);
		base_zip.addFile(path, e.getData());
	});
	return base_zip;
}

function renamePathSegmentAtIndex(path: string, new_name: string, index: number): string {
	const PATH_SEPARATOR = '/';
	return path
		.split(PATH_SEPARATOR)
		.map((chunk, i) => {
			if (i == index) return new_name;
			else return chunk;
		})
		.join(PATH_SEPARATOR);
}

export function get_zip_root_folder(zip: AdmZip): string {
	return zip.getEntries().at(0)?.entryName.replace('/', '') ?? '';
}

export function prepend_zip_root_folder(zip: AdmZip, path: string) {
	const root = get_zip_root_folder(zip);
	return `${root}/${path}`;
}
