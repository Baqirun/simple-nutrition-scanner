<script lang='ts'>
    import { productStore } from '$lib/ui/product.svelte';
    import FoodCard from '$components/product/FoodCardList.svelte';
    import Search from '@lucide/svelte/icons/search';
    import * as m from '$lib/paraglide/messages';

    let searchTerm = $state("");

    let filteredHistory = $derived(
        productStore.items.filter(item =>
            item.product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.product.brands || "").toLowerCase().includes(searchTerm.toLowerCase())
        )
    );
</script>

<div class=" mx-auto min-h-screen pb-24 p-5">
    <h1 class="text-2xl font-bold mb-6 ">{m.history_title()}</h1>

    <div class="form-control mb-6 ">
        <label class="input input-bordered join-item w-full focus:input-primary">
        	<Search/>
          <input type="text" class="grow" placeholder={m.history_search_placeholder()} bind:value={searchTerm} />
        </label>
    </div>

  <FoodCard items={filteredHistory} toggleDelete={true}/>
</div>
