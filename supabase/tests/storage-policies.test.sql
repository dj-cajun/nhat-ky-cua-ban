-- Storage: diary-photos bucket is private; non-owners/non-shared cannot select/insert

SELECT 'storage-policies: bucket diary-photos public=false + folder = auth.uid()'::text AS note;
