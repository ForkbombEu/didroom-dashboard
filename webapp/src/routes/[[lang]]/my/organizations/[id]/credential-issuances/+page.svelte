<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import { Collections, TemplatesTypeOptions, type ServicesResponse } from '$lib/pocketbase/types';
	import { CollectionManager, DeleteRecord } from '$lib/collectionManager';
	import { Plus, ArrowRight, Eye, Pencil, Trash } from 'svelte-heros-v2';
	import { Button, Badge } from 'flowbite-svelte';
	import { page } from '$app/stores';
	import { createTypeProp } from '$lib/utils/typeProp';
	import { m } from '$lib/i18n';
	import OrganizationLayout from '$lib/components/organizationLayout.svelte';
	import PageCard from '$lib/components/pageCard.svelte';
	import SectionTitle from '$lib/components/sectionTitle.svelte';
	import PlainCard from '$lib/components/plainCard.svelte';
	import { c } from '$lib/utils/strings.js';
	import ImagePreview from '$lib/components/imagePreview.svelte';
	import CollectionEmptyState from '$lib/collectionManager/ui/collectionEmptyState.svelte';
	import { ProtectedOrgUI } from '$lib/organizations/index.js';
	import Icon from '$lib/components/icon.svelte';

	export let data;
	$: organization = data.organization;

	const recordType = createTypeProp<ServicesResponse>();

	$: createIssuanceUrl = `${$page.url.pathname}/create`;

	$: templatesUrl = (type: TemplatesTypeOptions) =>
		`/my/organizations/${organization.id}/templates?filter=${type}`;

	$: issuanceFlowUrl = (id: string, edit = false) =>
		`${$page.url.pathname}/${id}${edit ? '/edit' : ''}`;
</script>

<OrganizationLayout org={data.organization}>
	<PageCard>
		<CollectionManager
			{recordType}
			collection={Collections.Services}
			let:records
			initialQueryParams={{
				filter: `organization.id = '${organization.id}'`
			}}
		>
			<svelte:fragment slot="emptyState">
				<CollectionEmptyState hideCreateButton></CollectionEmptyState>
			</svelte:fragment>

			<SectionTitle
				tag="h5"
				title={m.Issuance_flows()}
				description={m.issuance_flows_description()}
			>
				<svelte:fragment slot="right">
					<ProtectedOrgUI orgId={organization.id} roles={['admin', 'owner']}>
						<div class="flex gap-2">
							<Button
								href={templatesUrl(TemplatesTypeOptions.authorization)}
								outline
								class="shrink-0"
							>
								{m.Authorization_templates()}
								<ArrowRight size="20" class="ml-1" />
							</Button>

							<Button href={templatesUrl(TemplatesTypeOptions.issuance)} outline class="shrink-0">
								{m.Credential_templates()}
								<ArrowRight size="20" class="ml-1" />
							</Button>

							<Button href={createIssuanceUrl} class="shrink-0">
								{m.New_issuance_flow()}
								<Plus size="20" class="ml-1" />
							</Button>
						</div>
					</ProtectedOrgUI>
				</svelte:fragment>
			</SectionTitle>

			{#if records.length > 0}
				<div class="space-y-4">
					{#each records as record}
						<PlainCard>
							<svelte:fragment slot="left">
								<d-avatar name={record.display_name} src={record.logo} size="sm" shape="square" />
							</svelte:fragment>

							<div class="flex items-center gap-2">
								<p class="text-primary-700 font-semibold">{c(record.display_name)}</p>
								{#if record.public}
									<Badge color="dark">{m.Public()}</Badge>
								{/if}
							</div>
							{#if record.description}
								<p class="text-sm text-gray-500">{record.description}</p>
							{/if}

							<svelte:fragment slot="right">
								<div class="flex items-center gap-2">
									<Button outline size="sm" href={issuanceFlowUrl(record.id)}>
										{m.View()}
										<Icon src={Eye} ml />
									</Button>

									<ProtectedOrgUI orgId={organization.id} roles={['admin', 'owner']}>
										<Button outline size="sm" href={issuanceFlowUrl(record.id, true)}>
											{m.Edit()}
											<Icon src={Pencil} ml />
										</Button>

										<DeleteRecord {record} let:openModal>
											<Button outline size="sm" on:click={openModal}>
												<Icon src={Trash} />
											</Button>
										</DeleteRecord>
									</ProtectedOrgUI>
								</div>
							</svelte:fragment>
						</PlainCard>
					{/each}
				</div>
			{/if}
		</CollectionManager>
	</PageCard>
</OrganizationLayout>
