export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  return $fetch(`/notes/${id}`, {
    method: "PUT",
    baseURL: config.nodusApiBase,
    body,
  });
});
