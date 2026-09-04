export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody(event);

  return $fetch("/folders", {
    method: "POST",
    baseURL: config.nodusApiBase,
    body,
  });
});
