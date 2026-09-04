export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const id = getRouterParam(event, "id");

  return $fetch(`/folders/${id}`, {
    method: "DELETE",
    baseURL: config.nodusApiBase,
  });
});
