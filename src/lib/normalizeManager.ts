export interface TeamMember {
  cod_rca_lopes: string;
  nome_rca: string | null;
  nome_equipe: string;
  cargo: string | null;
}

/**
 * Extrai apenas o prefixo da equipe (ex: "EQUIPE E") de nome_equipe
 * nome_equipe pode ser "EQUIPE E - RICARDO LIMA E SILVA FILHO" ou apenas "EQUIPE E"
 */
const extractTeamPrefix = (nomeEquipe: string): string => {
  const match = nomeEquipe.match(/^(EQUIPE\s+\w+)/i);
  return match ? match[1].trim() : nomeEquipe.trim();
};

/**
 * Extrai o nome limpo de nome_rca removendo o prefixo de letra
 * nome_rca pode ser "E - RICARDO LIMA E SILVA FILHO" ou "E03 - NOME"
 */
const extractCleanName = (nomeRca: string): string => {
  return nomeRca.replace(/^\w+\s*-\s*/i, '').trim();
};

/**
 * Constrói o nome formatado corretamente: "EQUIPE X - NOME COMPLETO (Cargo)"
 */
const buildManagerName = (member: TeamMember): string => {
  const teamPrefix = extractTeamPrefix(member.nome_equipe);
  const cleanName = member.nome_rca ? extractCleanName(member.nome_rca) : member.cod_rca_lopes;
  const cargoLabel = member.cargo === "coordenador" ? "Coordenador" 
    : member.cargo === "gerente" ? "Gerente" 
    : "Supervisor";
  return `${teamPrefix} - ${cleanName} (${cargoLabel})`;
};

/**
 * Normaliza código numérico ou abreviações para formato padrão
 * Formato: "EQUIPE X - NOME COMPLETO (Cargo)"
 */
export const normalizeManagerName = (
  manager: string,
  teamMembers: TeamMember[] = []
): string => {
  if (!manager) return "";
  
  const trimmedManager = manager.trim();
  
  // Detectar formato duplicado: "EQUIPE X - QUALQUER_COISA - X(digitos?) - RESTO"
  // Usa back-reference (\2) para detectar a letra da equipe repetida como delimitador
  const duplicatedPattern = /^(EQUIPE\s+(\w))\s*-\s*.+?\s*-\s*\2\d*\s*-\s*(.+)$/i;
  const dupMatch = trimmedManager.match(duplicatedPattern);
  if (dupMatch) {
    const cleaned = `${dupMatch[1].trim()} - ${dupMatch[3].trim()}`
      .replace(/\s+/g, ' ')
      .replace(/\(Sup\.\)/i, '(Supervisor)')
      .replace(/\(Coord\.\)/i, '(Coordenador)')
      .replace(/\(Ger\.\)/i, '(Gerente)');
    return cleaned;
  }
  
  // Se for código numérico, buscar nome completo
  if (/^\d+$/.test(trimmedManager)) {
    const member = teamMembers.find(m => m.cod_rca_lopes.trim() === trimmedManager);
    if (member) {
      return buildManagerName(member);
    }
    return trimmedManager;
  }

  // Tentar match parcial com teamMembers para resolver nomes truncados
  if (teamMembers.length > 0) {
    // Extrair letra da equipe do nome atual
    const teamLetterMatch = trimmedManager.match(/EQUIPE\s+(\w)/i);
    if (teamLetterMatch) {
      const teamLetter = teamLetterMatch[1].toUpperCase();
      
      // Buscar membros da mesma equipe (coordenador/supervisor/gerente)
      const teamMembersInEquipe = teamMembers.filter(m => {
        const memberLetter = m.nome_equipe.match(/EQUIPE\s+(\w)/i)?.[1]?.toUpperCase();
        return memberLetter === teamLetter;
      });
      
      if (teamMembersInEquipe.length > 0) {
        // Extrair nome atual (sem cargo e sem prefixo de equipe)
        const currentName = trimmedManager
          .replace(/\s*\([^)]+\)\s*$/i, '')
          .replace(/^EQUIPE\s+\w+\s*-\s*/i, '')
          .trim()
          .toUpperCase();
        
        // Tentar match exato primeiro
        const exactMatch = teamMembersInEquipe.find(m => {
          const fullName = m.nome_rca ? extractCleanName(m.nome_rca).toUpperCase() : '';
          return fullName === currentName;
        });
        
        if (exactMatch) {
          return buildManagerName(exactMatch);
        }
        
        // Tentar match por prefixo (nome truncado)
        const prefixMatch = teamMembersInEquipe.find(m => {
          const fullName = m.nome_rca ? extractCleanName(m.nome_rca).toUpperCase() : '';
          if (!fullName || !currentName) return false;
          // O nome completo começa com o nome truncado, ou vice-versa
          return (fullName.startsWith(currentName) || currentName.startsWith(fullName)) 
            && fullName !== currentName;
        });
        
        if (prefixMatch) {
          return buildManagerName(prefixMatch);
        }

        // Tentar match parcial (nome contém parte significativa)
        if (currentName.length >= 5) {
          const partialMatch = teamMembersInEquipe.find(m => {
            const fullName = m.nome_rca ? extractCleanName(m.nome_rca).toUpperCase() : '';
            if (!fullName) return false;
            // Verificar se o primeiro nome coincide e o truncado é menor
            const currentFirst = currentName.split(' ')[0];
            const fullFirst = fullName.split(' ')[0];
            return currentFirst === fullFirst && currentName.length < fullName.length * 0.8;
          });
          
          if (partialMatch) {
            return buildManagerName(partialMatch);
          }
        }
      }
    }
  }
  
  // Normalizar abreviações para forma completa
  return trimmedManager
    .replace(/\s+/g, ' ')
    .replace(/\(Sup\.\)/i, '(Supervisor)')
    .replace(/\(Coord\.\)/i, '(Coordenador)')
    .replace(/\(Ger\.\)/i, '(Gerente)')
    .trim();
};

/**
 * Versão curta para gráficos (LUAN S., RICARDO L.)
 */
export const getShortManagerName = (fullName: string): string => {
  if (!fullName) return "";
  
  // Format: "EQUIPE X - NOME COMPLETO (Cargo)" ou "EQUIPE X - NOME COMPLETO"
  const match = fullName.match(/EQUIPE\s*\w?\s*-\s*([^\(]+)/i);
  if (match) {
    const namePart = match[1].trim();
    const names = namePart.split(' ').filter(n => n.length > 0);
    if (names.length >= 2) {
      // Primeiro nome + inicial do segundo
      return `${names[0]} ${names[1][0]}.`;
    }
    return names[0] || namePart;
  }
  
  // Fallback: tentar extrair só o primeiro nome
  const names = fullName.split(' ').filter(n => n.length > 0);
  if (names.length >= 2) {
    return `${names[0]} ${names[1][0]}.`;
  }
  return fullName.substring(0, 15) + (fullName.length > 15 ? '...' : '');
};

/**
 * Extrai nome base (sem cargo) para matching robusto
 * Usado para comparar nomes entre visit_forms.manager e team_daily_goals.nome_equipe
 */
export const getBaseManagerName = (fullName: string): string => {
  if (!fullName) return "";
  
  return fullName
    .replace(/\s*\([^)]+\)\s*$/i, '')  // Remove "(Supervisor)", "(Coordenador)", etc.
    .replace(/\s+/g, ' ')              // Normaliza espaços
    .trim();
};

/**
 * Verifica se dois nomes de gestor correspondem ao mesmo gestor
 */
export const isManagerMatch = (
  name1: string,
  name2: string,
  rcaCode1?: string | null,
  rcaCode2?: string | null
): boolean => {
  if (!name1 || !name2) return false;
  
  const base1 = getBaseManagerName(name1);
  const base2 = getBaseManagerName(name2);
  
  // Match exato por nome base
  if (base1 === base2) return true;
  
  // Match por código RCA
  if (rcaCode1 && name2.trim() === rcaCode1) return true;
  if (rcaCode2 && name1.trim() === rcaCode2) return true;
  
  return false;
};

/**
 * Exporta helpers para uso externo
 */
export { extractTeamPrefix, extractCleanName, buildManagerName };
