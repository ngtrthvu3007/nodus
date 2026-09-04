export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  return $fetch(`/folders/${id}`, {
    method: "PATCH",
    baseURL: config.nodusApiBase,
    body,
  });
});
