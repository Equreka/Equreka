<template>
	<div class="table-responsive">
		<table class="table table-data table-favorites">
			<thead>
				<tr>
					<th scope="col" class="category">
						<Abbr string="category"/>
					</th>
					<th scope="col" class="type" v-if="false">
						{{ $t('Type') }}
					</th>
					<th scope="col" class="name">
						{{ $t('Name') }}
					</th>
					<th scope="col" class="actions">
						{{ $t('Actions') }}
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="item in data" :key="item.slug" :class="item.category">
					<td class="category" v-if="item.category">
						<NuxtLink class="badge badge-category" :to="localePath(`/${item.category}`)">
							<Abbr :string="item.category" />
						</NuxtLink>
					</td>
					<td class="type" :class="type" v-if="false">
						<NuxtLink class="badge badge-type" :to="localePath(`${item.dir}`)">
							<Abbr :string="type" />
						</NuxtLink>
					</td>
					<td class="name" v-if="item.name">
						<NuxtLink class="link-category" :to="localePath(`${item.dir}/${item.slug}`)">
							{{ item.name }}
						</NuxtLink>
					</td>
					<td class="actions">
						<NuxtLink class="btn btn-text btn-primary text-light p-0 rounded-2 me-2" :to="localePath(`/calculator${item.dir}/${item.slug}`)" :title="$t('calculator.go-to-calculator')" v-if="item.supported">
							<span class="visually-hidden">{{ $t('calculator.go-to-calculator') }}</span>
							<i class="bi bi-plus fs-5"></i>
						</NuxtLink>
						<button class="btn btn-text btn-danger text-light p-0 rounded-pill" type="button" @click="removeFavorite(type, item.slug)" :title="$t('favorites.remove')" v-if="edit">
							<span class="visually-hidden">{{ $t('favorites.remove') }}</span>
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
				} else {
					alert(this.$t('An error occurred'));
				}
			}
		}
	}
</script>