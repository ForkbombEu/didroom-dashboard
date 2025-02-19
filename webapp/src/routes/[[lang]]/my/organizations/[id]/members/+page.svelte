<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import { CollectionManager } from '$lib/collectionManager';
	import {
		Collections,
		type OrgAuthorizationsResponse,
		type OrgRolesResponse,
		type UsersResponse
	} from '$lib/pocketbase/types';
	import { createTypeProp } from '$lib/utils/typeProp';
	import { m } from '$lib/i18n';
	import { OrgRoles, ProtectedOrgUI } from '$lib/organizations';

	import { Button, Badge } from 'flowbite-svelte';
	import { Pencil, Plus, XMark } from 'svelte-heros-v2';

	import PageCard from '$lib/components/pageCard.svelte';
	import SectionTitle from '$lib/components/sectionTitle.svelte';
	import PlainCard from '$lib/components/plainCard.svelte';
	import UserAvatar from '$lib/components/userAvatar.svelte';
	import { currentUser } from '$lib/pocketbase/index.js';
	import { c } from '$lib/utils/strings.js';
	import EditRecord from '$lib/collectionManager/ui/recordActions/editRecord.svelte';
	import DeleteRecord from '$lib/collectionManager/ui/recordActions/deleteRecord.svelte';
	import MembershipRequests from './_partials/membershipRequests.svelte';
	import { getUserDisplayName } from '$lib/utils/pb';
	import OrganizationLayout from '$lib/components/organizationLayout.svelte';
	import ModalWrapper from '$lib/components/modalWrapper.svelte';
	import InviteMembersForm from './_partials/inviteMembersForm.svelte';
	import PendingInvites from './_partials/pendingInvites.svelte';

	//

	export let data;
	$: ({ organization, userRole } = data);

	type AuthorizationWithUser = OrgAuthorizationsResponse<{
		user: UsersResponse;
		role: OrgRolesResponse;
	}>;

	const recordType = createTypeProp<AuthorizationWithUser>();
</script>

<OrganizationLayout org={organization}>
	<ProtectedOrgUI orgId={organization.id} roles={['admin', 'owner']}>
		<MembershipRequests {organization} />
		<PendingInvites {organization} />
	</ProtectedOrgUI>

	<PageCard>
		<CollectionManager
			{recordType}
			collection={Collections.OrgAuthorizations}
			formSettings={{
				hide: { organization: organization.id },
				relations: {
					role: { inputMode: 'select', displayFields: ['name'] },
					user: { displayFields: ['name', 'email'] }
				}
			}}
			editFormSettings={{
				exclude: ['user']
			}}
			initialQueryParams={{ expand: 'user,role', filter: `organization.id="${organization.id}"` }}
			let:records
		>
			<SectionTitle tag="h5" title={m.Members()} description={m.members_description()}>
				<ProtectedOrgUI orgId={organization.id} roles={['admin', 'owner']} slot="right">
					<div class="flex items-center gap-2">
						<ModalWrapper
							title={m.invite_members()}
							let:openModal
							modalProps={{ class: 'overflow-hidden' }}
						>
							<Button on:click={openModal}>
								<Plus size="20" class="mr-2" />
								{m.invite_members()}
							</Button>

							<svelte:fragment slot="modal" let:closeModal>
								<InviteMembersForm
									organizationId={organization.id}
									onSuccess={closeModal}
									onCancel={closeModal}
								/>
							</svelte:fragment>
						</ModalWrapper>
					</div>
				</ProtectedOrgUI>
			</SectionTitle>

			<div class="space-y-2">
				{#each records as record}
					{@const user = record.expand?.user}
					{@const role = record.expand?.role}
					{#if user && role && userRole}
						<PlainCard>
							<div class="flex items-center gap-4">
								<UserAvatar size="md" {user}></UserAvatar>
								<p>
									{getUserDisplayName(user)}
								</p>
								<div class="flex gap-2">
									{#if user.id == $currentUser?.id}
										<Badge color="dark">{m.You()}</Badge>
									{/if}
									{#if role.name != OrgRoles.MEMBER}
										<Badge color="dark">{c(role.name)}</Badge>
									{/if}
								</div>
							</div>

							<svelte:fragment slot="right">
								<ProtectedOrgUI orgId={organization.id} roles={['admin', 'owner']}>
									<div class="space-x-1">
										{#if userRole.level < role.level}
											<EditRecord {record} let:openModal>
												<Button outline color="primary" size="sm" on:click={openModal}>
													Edit role
													<Pencil size="20" class="ml-2"></Pencil>
												</Button>
											</EditRecord>

											<DeleteRecord {record} let:openModal>
												<Button outline color="primary" size="sm" on:click={openModal}>
													Remove
													<XMark size="20" class="ml-2"></XMark>
												</Button>
											</DeleteRecord>
										{/if}
									</div>
								</ProtectedOrgUI>
							</svelte:fragment>
						</PlainCard>
					{/if}
				{/each}
			</div>
		</CollectionManager>
	</PageCard>
</OrganizationLayout>
