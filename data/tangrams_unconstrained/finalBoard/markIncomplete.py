import os
fileList = ["2016-31-6-19-33-18-329_6690-95e4306d-6724-48b9-9329-44f57e584418",
            "2016-31-6-19-3-45-776_1548-ef2b022a-5997-4006-802b-8ac7af0356e6",
            "2016-31-6-19-25-11-287_1027-7c54cad6-07eb-4832-a443-9eb5790ed67a",
            "2016-31-6-19-2-48-351_0737-29645817-2516-4a9c-9a31-8a11a75e1345",
            "2016-31-6-19-2-29-346_3296-0bc6f81d-c0ba-4419-bff9-1ab521e0bec8",
            "2016-31-6-19-2-14-222_9568-988c4e81-ce10-4ebd-b1b0-d6b79dc7d876",
            "2016-31-6-18-57-9-874_0736-710e46e9-458d-4550-a38d-44937f846106",
            "2016-31-6-18-53-18-876_8813-0adfdf28-2bd8-4401-976d-18f9f7466c79",
            "2016-31-6-18-52-39-194_5497-4da4a7d5-8d21-420f-a0c5-113550519494",
            "2016-31-6-18-41-35-463_7870-77ccf9c5-6f30-46fc-bf4d-372031520b65",
            "2016-31-6-18-37-53-304_3127-e6ff332a-de70-4551-a362-c2185f4023e7",
            "2016-31-6-18-31-34-700_2714-cc646a4f-5451-479d-a44d-81096e4ce13b",
            "2016-31-6-18-3-58-749_3180-e9cb2a3c-540e-4d71-9a0b-4a3cbf6b0a4d",
            "2016-31-6-18-20-2-993_1507-019616e1-4881-4456-920c-7d3eb1d6165f",
            "2016-31-6-18-2-52-250_4300-28c40d48-5815-4278-9d56-687fa801cdb7",
            "2016-31-6-18-17-25-457_0176-878ae725-0146-4bbd-b289-6f5a42410df0",
            "2016-31-6-18-17-13-312_8189-c092a4a7-a56c-4301-9502-17e426e41416",
            "2016-31-6-17-59-1-402_5564-c0c49f69-42dd-433d-b1eb-ff87f8b25ee4",
            "2016-31-6-17-57-1-741_2908-a934f77c-251c-4820-9720-0faa51aace4f",
            "2016-31-6-17-34-34-364_4493-04fd25d6-eb37-4ed4-8dac-b1fa75590812",
            "2016-31-6-17-3-48-736_3893-5fb6868e-f50d-45f0-95bc-f918d7669a25",
            "2016-31-6-17-29-31-711_6766-ee18876d-3c4e-4ddb-9510-1e2a5bc0da90",
            "2016-31-6-17-22-48-606_9348-534dab52-00eb-465f-b243-b5736984c343",
            "2016-31-6-16-50-46-827_2970-1134b51f-db0e-419f-85a2-05879b5c341f",
            "2016-31-6-16-44-13-974_4904-30428deb-c554-42c3-b125-fb79d62cc0ec",
            "2016-31-6-16-41-52-550_9181-d6d31e29-f427-4549-b911-ecb84a7acc4a"]

for fileName in fileList :
    os.rename("./" + fileName, "./incomplete/" + fileName)
    os.rename("../message/" + fileName, "../message/incomplete/" + fileName)
    os.rename("../dropObj/" + fileName, "../dropObj/incomplete/" + fileName)