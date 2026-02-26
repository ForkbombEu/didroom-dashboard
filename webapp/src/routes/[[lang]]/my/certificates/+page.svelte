<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import { Badge, Button, Modal, TableBodyCell, TableHeadCell } from 'flowbite-svelte';
	import { CollectionManager, CollectionTable, CollectionEmptyState } from '$lib/collectionManager';
	import { Collections, type CertificatesResponse } from '$lib/pocketbase/types';
	import { createTypeProp } from '$lib/utils/typeProp';
	import PortalWrapper from '$lib/components/portalWrapper.svelte';
	import { Plus, ArrowUpTray, ArrowDownTray } from 'svelte-heros-v2';
	import DeleteRecord from '$lib/collectionManager/ui/recordActions/deleteRecord.svelte';
	import { createToggleStore } from '$lib/components/utils/toggleStore';
	import PageContent from '$lib/components/pageContent.svelte';
	import PageCard from '$lib/components/pageCard.svelte';
	import SectionTitle from '$lib/components/sectionTitle.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { Eye } from 'svelte-heros-v2';

	import CertificateForm from './_partials/certificateForm.svelte';
	import CertificateView from './_partials/certificateView.svelte';
	import ReuploadCertificateForm from './_partials/reuploadCertificateForm.svelte';
	import AutosignedCertificateForm from './_partials/autosignedCertificateForm.svelte';
	import { m } from '$lib/i18n';
	import {
		deleteCertificateInLocalStorage,
		isCertificateInLocalStorage
	} from '$lib/certificates/storage';
	import { nanoid } from 'nanoid';
	import PageTop from '$lib/components/pageTop.svelte';
	import { pb } from '$lib/pocketbase';

	//

	const recordType = createTypeProp<CertificatesResponse>();

	const showCertificateModal = createToggleStore(false);
	const showViewCertificateModal = createToggleStore(false);
	const showAutosignedCertificateModal = createToggleStore(false);
	const showReuploadCertificateModal = createToggleStore(false);

	//

	let certificateToReupload = '';
	let certificateToShow = '';

	//

	let certificateRedrawKey = '';
	function triggerCertificateRedraw() {
		certificateRedrawKey = nanoid(5);
	}

	function downloadCACertificate() {
		window.open(`${pb.baseURL}/api/ca/certificate`, '_blank');
	}
</script>

<PageContent>
	<PageCard>
		<div class="space-y-8 rounded-lg border-slate-200 p-4">
			<SectionTitle title="My Certificates" description={m.my_certificates_description()}>
				<svelte:fragment slot="right">
					<div class="flex items-center gap-2">
						<Button color="alternative" on:click={downloadCACertificate}>
							<Icon src={ArrowDownTray} mr />
							Download CA Certificate
						</Button>
						<Button on:click={showCertificateModal.on}>
							<Icon src={Plus} mr />
							{m.Add_a_Key_Certificate_Pair()}
						</Button>
					</div>
				</svelte:fragment>
			</SectionTitle>

			<CollectionManager
				collection={Collections.Certificates}
				{recordType}
				let:records
				hideEmptyState
			>
				<CollectionTable
					{records}
					fields={['name']}
					hideActions={['select', 'edit', 'share', 'delete']}
					hideEmptyState
				>
					<svelte:fragment slot="header">
						<TableHeadCell>Storage status</TableHeadCell>
					</svelte:fragment>
					<svelte:fragment slot="row" let:record>
						{@const certificateExists = isCertificateInLocalStorage(record.name)}
						{#key certificateRedrawKey}
							<TableBodyCell>
								{#if certificateExists}
									<Badge color="green">Available</Badge>
								{:else}
									<div class="flex items-center gap-2">
										<Badge color="red">Missing</Badge>
										<Button
											size="xs"
											color="alternative"
											on:click={() => {
												certificateToReupload = record.name;
												showReuploadCertificateModal.on();
											}}
										>
											<ArrowUpTray size="16"></ArrowUpTray>
											<span class="ml-1.5">{m.Load_certificate()}</span>
										</Button>
									</div>
								{/if}
							</TableBodyCell>
						{/key}
					</svelte:fragment>

					<svelte:fragment slot="actions" let:record>
						<Button
							outline
							size="sm"
							on:click={() => {
								certificateToShow = record.name;
								showViewCertificateModal.on();
							}}
						>
							{m.View()}
							<Icon src={Eye} ml></Icon>
						</Button>
						<DeleteRecord
							{record}
							beforeDelete={() => deleteCertificateInLocalStorage(record.name)}
						/>
					</svelte:fragment>
				</CollectionTable>

				<svelte:fragment slot="emptyState">
					<CollectionEmptyState hideCreateButton>
						<Button
							slot="bottom"
							on:click={showAutosignedCertificateModal.on}
							class="mt-4"
							color="alternative"
						>
							<Icon src={Plus} mr />
							{m.Generate_an_autosigned_certificate()}
						</Button>
					</CollectionEmptyState>
				</svelte:fragment>
			</CollectionManager>
		</div>
	</PageCard>
</PageContent>

<PortalWrapper>
	<Modal bind:open={$showViewCertificateModal} title="View certificate">
		<CertificateView certificateName={certificateToShow} />
	</Modal>

	<Modal bind:open={$showCertificateModal} title="Key and certificate">
		<CertificateForm onComplete={showCertificateModal.off} />
	</Modal>

	<Modal bind:open={$showReuploadCertificateModal} title="Load key">
		<ReuploadCertificateForm
			certificateName={certificateToReupload}
			onComplete={() => {
				triggerCertificateRedraw();
				showReuploadCertificateModal.off();
			}}
		/>
	</Modal>

	<Modal bind:open={$showAutosignedCertificateModal} title="Autosigned certificate">
		<AutosignedCertificateForm onComplete={showAutosignedCertificateModal.off} />
	</Modal>
</PortalWrapper>
