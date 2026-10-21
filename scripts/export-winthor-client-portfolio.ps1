param(
    [string]$OutputPath = (Join-Path $PWD ("carteira-clientes-winthor-{0}.csv" -f (Get-Date -Format 'yyyy-MM-dd'))),
    [string]$Dsn = 'ODBC MYSQL',
    [string]$Database = 'stg_silver_winthor'
)

$ErrorActionPreference = 'Stop'
$connection = $null
$reader = $null

function Get-TextValue {
    param($DataReader, [string]$Column)
    $index = $DataReader.GetOrdinal($Column)
    if ($DataReader.IsDBNull($index)) { return $null }
    return ([string]$DataReader.GetValue($index)).Trim()
}

try {
    $connection = New-Object System.Data.Odbc.OdbcConnection("DSN=$Dsn;DATABASE=$Database")
    $connection.Open()

    $command = $connection.CreateCommand()
    $command.CommandTimeout = 600
    $command.CommandText = @"
SELECT codcli, cliente, fantasia, cgcent, tipofj, endereco, bairro, cidade, estado,
       ramo, telent, email, situacao, rca, nome_rca
FROM view_rca_cliente
WHERE LOWER(TRIM(situacao)) = 'ativo'
ORDER BY codcli, rca
"@

    $reader = $command.ExecuteReader()
    $rows = [System.Collections.Generic.List[object]]::new()

    while ($reader.Read()) {
        $shared = @{
            codcli = Get-TextValue $reader 'codcli'
            razao_social = Get-TextValue $reader 'cliente'
            nome_fantasia = Get-TextValue $reader 'fantasia'
            cnpj = Get-TextValue $reader 'cgcent'
            tipo_fj = Get-TextValue $reader 'tipofj'
            endereco = Get-TextValue $reader 'endereco'
            bairro = Get-TextValue $reader 'bairro'
            cidade = Get-TextValue $reader 'cidade'
            uf = Get-TextValue $reader 'estado'
            ramo_atividade = Get-TextValue $reader 'ramo'
            telefone = Get-TextValue $reader 'telent'
            email = Get-TextValue $reader 'email'
            situacao = 'ATIVO'
        }

        $routeCode = Get-TextValue $reader 'rca'
        if ([string]::IsNullOrWhiteSpace($routeCode)) { continue }

        $rows.Add([pscustomobject]@{
            codcli = $shared.codcli
            razao_social = $shared.razao_social
            nome_fantasia = $shared.nome_fantasia
            cnpj = $shared.cnpj
            tipo_fj = $shared.tipo_fj
            endereco = $shared.endereco
            bairro = $shared.bairro
            cidade = $shared.cidade
            uf = $shared.uf
            ramo_atividade = $shared.ramo_atividade
            telefone = $shared.telefone
            email = $shared.email
            situacao = $shared.situacao
            cod_rca = $routeCode
            nome_rca = Get-TextValue $reader 'nome_rca'
        })
    }

    $targetDirectory = Split-Path -Parent $OutputPath
    if ($targetDirectory -and -not (Test-Path -LiteralPath $targetDirectory)) {
        New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null
    }
    $rows | Export-Csv -LiteralPath $OutputPath -Delimiter ';' -NoTypeInformation -Encoding utf8

    $h06Rows = @($rows | Where-Object { $_.cod_rca -eq '3706' })
    [pscustomobject]@{
        OutputPath = (Resolve-Path -LiteralPath $OutputPath).Path
        Links = $rows.Count
        Clients = @($rows.codcli | Sort-Object -Unique).Count
        H06Clients = @($h06Rows.codcli | Sort-Object -Unique).Count
        H06Vendor = @($h06Rows.nome_rca | Where-Object { $_ } | Select-Object -Unique) -join ', '
    }
}
finally {
    if ($reader) { $reader.Close() }
    if ($connection -and $connection.State -eq 'Open') { $connection.Close() }
}
