<template>
	<div class="table-responsive">
		<table class="table table-data table-favorites">
			<thead>
				<tr>
					<th scope="col" class="category">
						<Abbr string="category"/>
					</th>
					<th scope="col" class="type" v-if="false">
						{{ $t('table.type') }}
					</th>
					<th scope="col" class="name">
						{{ $t('table.name') }}
					</th>
					<th scope="col" class="actions">
						{{ $t('table.actions') }}
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="item in data" :key="item.slug" :class="item.category">
					<td class="category" v-if="item.categories && item.categories.length > 0">
						<NuxtLink class="badge badge-category" :class="item.categories[0]" :to="localePath(`/categories/${item.categories[0]}`)">
							<Abbr :string="item.categories[0]" />
						</NuxtLink>
					</td>
					<td class="type" :class="type" v-if="false">
						<NuxtLink class="badge badge-type" :to="localePath(item.path)">
							<Abbr :string="type" />
						</NuxtLink>
					</td>
					<td class="name" v-if="item.name">
						<NuxtLink class="link-category" :to="localePath(item.path)">
							{{ item.name }}
						</NuxtLink>
					</td>
					<td class="actions">
						<NuxtLink class="btn btn-text btn-primary text-light p-0 rounded-2 me-2" :to="localePath(`/calculator${item.path}`)" :title="$t('calculator.go-to-calculator')" v-if="item.supported">
							<span class="visually-hidden">
								{{ $t('calculator.go-to-calculator') }}
							</span>
							<i class="bi bi-plus fs-5"></i>
						</NuxtLink>
						<button class="btn btn-text btn-danger text-light p-0 rounded-pill" type="button" @click="removeFavorite(type, item.slug)" :title="$t('favorites.remove')" v-if="edit">
							<span class="visually-hidden">
								{{ $t('favorites.remove') }}
							</span>
							<i class="bi bi-x fs-5"></i>
						</button>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>


<script>
	import Favorites from "~/utils/favorites";
	export default {
		props: {
			data: {
				type: Array | Object | Boolean,
				required: true
			},
			type: {
				type: String,
				required: true
			},
			edit: {
				type: Boolean,
				default: false
			}
		},
		computed: {
			show() {
				let show = this.data && this.data.length > 0 ? true : false;
				return show;
			},
		},
		methods: {
			removeFavorite(type, slug) {
				if(Favorites.remove(type, slug)) {
					this.$router.app.refresh();
				}
			}
		}
	}
</script>