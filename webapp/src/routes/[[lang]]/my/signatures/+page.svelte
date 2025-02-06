<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import { currentUser, pb } from '$lib/pocketbase';
	import {
		Collections,
		SignaturesTypeOptions,
		type FoldersResponse,
		type SignaturesResponse
	} from '$lib/pocketbase/types';
	import { CollectionManager, CreateRecord, EditRecord } from '$lib/collectionManager';
	import { Button, Toast, A, Dropdown, DropdownItem, Alert } from 'flowbite-svelte';
	import { ArrowDownTray, ArrowRight, Eye, Pencil, Plus } from 'svelte-heros-v2';
	import { slide } from 'svelte/transition';
	import { createTypeProp } from '$lib/utils/typeProp';
	import CollectionEmptyState from '$lib/collectionManager/ui/collectionEmptyState.svelte';
	import PageTop from '$lib/components/pageTop.svelte';
	import SectionTitle from '$lib/components/sectionTitle.svelte';
	import PageCard from '$lib/components/pageCard.svelte';
	import PageContent from '$lib/components/pageContent.svelte';
	import PlainCard from '$lib/components/plainCard.svelte';
	import DeleteRecord from '$lib/collectionManager/ui/recordActions/deleteRecord.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { ArrowLeft } from 'svelte-heros';
	import type { FieldsSettings } from '$lib/recordForm';
	import SignatureForm from './_partials/signatureForm.svelte';
	import PortalWrapper from '$lib/components/portalWrapper.svelte';
	import Drawer from '$lib/components/drawer.svelte';
	import { createToggleStore } from '$lib/components/utils/toggleStore';
	import { writable } from 'svelte/store';
	import _ from 'lodash';
	import SignatureTypeChip from './_partials/signatureTypeChip.svelte';
	import { downloadSignedFile, type Signature } from '$lib/signatures';
	import { downloadFileFromUrl } from '$lib/utils/clientFileDownload';
	import { m } from '$lib/i18n';
	import ShareRecord from '$lib/collectionManager/ui/recordActions/shareRecord.svelte';
	import { getInvalidCertificates } from './_partials/utils';
	import { getCertificatesFromLocalStorage } from '$lib/certificates/storage';

	//

	export let data;
	$: folder = data.folder;

	//

	let hideFolderSettings: FieldsSettings<Signature>['hide'];
	$: if (folder) {
		hideFolderSettings = { folder: folder.id };
	} else {
		hideFolderSettings = {};
	}

	//

	const signatureTypeProp = createTypeProp<Signature<{ folder: FoldersResponse }>>();
	const folderTypeProp = createTypeProp<FoldersResponse>();

	//

	const hideSignatureModal = createToggleStore(true);

	const type = writable<SignaturesTypeOptions | undefined>(undefined);
	function startCreateSignature(type: SignaturesTypeOptions | undefined) {
		$type = type;
		hideSignatureModal.off();
	}

	const signatureToEdit = writable<SignaturesResponse | undefined>(undefined);
	function startEditSignature(record: SignaturesResponse) {
		$signatureToEdit = record;
		hideSignatureModal.off();
	}

	//

	function downloadSignatureOriginalFile(signature: Signature) {
		const fileUrl = pb.getFileUrl(signature, signature.file);
		downloadFileFromUrl(fileUrl, signature.file);
	}

	//

	const toasts = {
		add: m._Signature_shared_successfully(),
		remove: m._Signature_unshared_successfully(),
		signed: m._Document_signed_successfully()
	};

	type ToastContent = keyof typeof toasts;

	let show = false;
	let content: string | undefined = undefined;
	const duration = 3000;

	function triggerToast(key: ToastContent) {
		show = true;
		content = toasts[key];
		setTimeout(() => {
			show = false;
			content = undefined;
		}, duration);
	}

	//

	function areCertificatesAvailable() {
		const allCertificates = Object.keys(getCertificatesFromLocalStorage());
		return allCertificates.length > 0;
	}

	function areCertificatesAvailableForSignatureType(type: SignaturesTypeOptions) {
		const allCertificates = Object.keys(getCertificatesFromLocalStorage());
		const invalidCertificates = getInvalidCertificates(type);
		return invalidCertificates.length < allCertificates.length;
	}
</script>

<PageContent>
	{#if !areCertificatesAvailable()}
		<PageCard>
			<Alert color="yellow" border>
				<div class="flex items-center justify-between gap-4">
					<div>
						<p class="mb-2 font-bold">{m.Warning()}</p>
						<p>{m.No_certificates_are_available_for_files_signature_()}</p>
						<p>{m.To_sign_a_new_file_please_load_a_new_certificate_()}</p>
					</div>
					<Button href="/my/certificates" color="primary" outline>
						<Icon src={ArrowRight} mr />
						{m.Go_to_certificates_page()}
					</Button>
				</div>
			</Alert>
		</PageCard>
	{/if}

	{#if !folder}
		<PageCard>
			<CollectionManager
				recordType={folderTypeProp}
				formSettings={{
					hide: {
						owner: $currentUser?.id
					}
				}}
				collection={Collections.Folders}
				let:records
				hideEmptyState
			>
				<SectionTitle title="Folders">
					<svelte:fragment slot="right">
						<CreateRecord recordType={folderTypeProp}>{m.Add_folder()}</CreateRecord>
					</svelte:fragment>
				</SectionTitle>

				<svelte:fragment slot="emptyState">
					<CollectionEmptyState hideCreateButton></CollectionEmptyState>
				</svelte:fragment>

				{#if records.length}
					<div class="space-y-2">
						{#each records as record}
							<PlainCard let:Title class="py-2.5">
								<Title>
									<A href="/my/signatures?folder={record.id}">
										{record.name}
									</A>
								</Title>
								<svelte:fragment slot="right">
									<EditRecord {record} />
									<DeleteRecord {record} />
								</svelte:fragment>
							</PlainCard>
						{/each}
					</div>
				{/if}
			</CollectionManager>
		</PageCard>
	{/if}

	{#key hideFolderSettings}
		<PageCard>
			<CollectionManager
				recordType={signatureTypeProp}
				collection={Collections.Signatures}
				initialQueryParams={{
					expand: 'folder',
					filter: `folder.id = "${folder ? folder.id : ''}" && owner.id = "${$currentUser?.id}"`
				}}
				formSettings={{
					hide: {
						owner: $currentUser?.id,
						...hideFolderSettings
					},
					relations: {
						folder: { displayFields: ['name'], inputMode: 'select' }
					},
					exclude: ['signed_file']
				}}
				editFormSettings={{
					exclude: ['owner', 'type', 'file']
				}}
				subscribe={[Collections.Authorizations, Collections.Folders]}
				let:records
				hideEmptyState
			>
				<!-- Header -->
				{@const title = folder ? folder.name : 'Signatures'}
				<div class="space-y-4">
					{#if folder}
						<Button outline href="/my/signatures">
							<Icon src={ArrowLeft} ml />
							{m.Back_to_all_signatures()}
						</Button>
					{/if}

					<SectionTitle {title}>
						<svelte:fragment slot="right">
							<div class="flex items-center gap-2">
								<Button outline href="/my/signatures/shared">
									<Icon src={Eye} mr />
									{m.View_shared_signatures()}
								</Button>
								<div>
									{#if areCertificatesAvailable()}
										<Button>
											<Icon src={Plus} mr />
											<span class="capitalize">{m.Sign_file()}</span>
										</Button>
									{/if}

									<Dropdown class="min-w-40">
										{#each Object.values(SignaturesTypeOptions) as type}
											<!-- {@const check = areCertificatesAvailableForSignatureType(type)} -->
											<DropdownItem on:click={() => startCreateSignature(type)}>
												<span class="capitalize">{type}</span>
											</DropdownItem>
										{/each}
									</Dropdown>
								</div>
							</div>
						</svelte:fragment>
					</SectionTitle>
				</div>

				<div class="space-y-2">
					{#each records as signature}
						<PlainCard let:Title let:Description class="py-2.5">
							<div class="flex items-center gap-2">
								<Title>{signature.title}</Title>
								<SignatureTypeChip type={signature.type} />
							</div>
							{#if signature.description}
								<Description>{signature.description}</Description>
							{/if}

							<svelte:fragment slot="right">
								<div class="flex items-center gap-2">
									<Button
										class="py-2"
										color="alternative"
										on:click={() => downloadSignedFile(signature)}
									>
										<Icon src={ArrowDownTray} mr />
										{m.Signed_file()}
									</Button>
									<Button
										class="py-2"
										color="alternative"
										on:click={() => downloadSignatureOriginalFile(signature)}
									>
										<Icon src={ArrowDownTray} mr />
										{m.Original_file()}
									</Button>
									<Button
										class="!p-2"
										color="alternative"
										on:click={() => startEditSignature(signature)}
									>
										<Icon src={Pencil} />
									</Button>
									<ShareRecord
										record={signature}
										on:add={() => triggerToast('add')}
										on:remove={() => triggerToast('remove')}
									/>
									<DeleteRecord record={signature} />
								</div>
							</svelte:fragment>
						</PlainCard>
					{/each}
				</div>

				<svelte:fragment slot="emptyState">
					<CollectionEmptyState hideCreateButton description={m.Start_by_signing_a_file()} />
				</svelte:fragment>
			</CollectionManager>
		</PageCard>
	{/key}
</PageContent>

<Toast position="bottom-right" color="primary" transition={slide} bind:toastStatus={show}>
	{content}
</Toast>

<PortalWrapper>
	{@const ownerId = $currentUser?.id ?? ''}
	{@const drawerTitle = $type ? `${$type} signature` : `Signature`}
	<Drawer
		title={drawerTitle}
		bind:hidden={$hideSignatureModal}
		placement="right"
		width="min-w-[70vw]"
		closeOnClickOutside={false}
	>
		<div class="p-8">
			{#if $type}
				<SignatureForm
					{ownerId}
					type={$type}
					onSubmit={() => {
						hideSignatureModal.on();
						triggerToast('add');
					}}
				/>
			{/if}
			{#if $signatureToEdit}
				<SignatureForm
					{ownerId}
					signatureId={$signatureToEdit.id}
					folderId={$signatureToEdit.folder}
					type={$signatureToEdit.type}
					onSubmit={hideSignatureModal.on}
					initialData={$signatureToEdit}
				/>
			{/if}
		</div>
	</Drawer>
</PortalWrapper>
